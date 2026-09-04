import ts from 'typescript'
import {transformContext} from './global'
import {VisitTree} from './visit-tree'
import {InterpolationContentType, Interpolator} from './interpolator'
import {AccessNode, AssignmentNode, ListMap, ScopeTree} from '../lupos-ts-module'
import {definePostVisitCallback} from './visitor-callbacks'
import {defineSourceFilePrepass} from './source-file-prepass'
import {DeclarationScope} from './scope'
import {Hashing, HashKey} from './hashing'


/** Whether a expression be mutable, and whether it can turn. */
export enum MutableMask {

	/** If referenced variable value is assignable, and need to update for multiple times. */
	Mutable = 1,

	/** 
	 * Whether have any local variable referenced outside function,
	 * so it will be visited immediately.
	 */
	HasLocalReferenceOutsideFunction = 2,

	/** 
	 * Whether have any local variable referenced within a function body,
	 * so it will be visited later.
	 */
	HasLocalReferenceInsideFunction = 4,

	/** Whether have any local variable assignment. */
	HasLocalAssignment = 8,
}

/** Replace an identifier or this keyword. */
type NodeReplacer = (
	node: ts.Identifier | ts.ThisExpression,
	closestRawNode: ts.Node,
	insideFunctionScope: boolean
) => ts.Expression


/** Manages all the declaration scopes as a tree struct. */
class ExtendedScopeTree extends ScopeTree<DeclarationScope> {

	/** Cache for faster visiting. */
	private nodeMutableMaskCache: WeakMap<ts.Node, number> = new WeakMap()

	/** Cache assign to hash name -> assignment expression. */
	private assignmentMap: ListMap<HashKey, AssignmentNode> = new ListMap()

	/** All added variable names, via scope. */
	private addedVariableNames: ListMap<DeclarationScope, string> = new ListMap()

	/** Assignment nodes are hashed after both shared prepass indexes are complete. */
	private assignmentsToIndex: AssignmentNode[] = []

	constructor() {
		super(transformContext.helper, DeclarationScope)
	}

	/** To parent. */
	override toParent(node: ts.Node) {
		super.toParent(node)

		// Must after visited all descendant nodes.
		// Assignment expressions like `a.b = c`
		if (transformContext.helper.assign.isAssignment(node)) {
			this.assignmentsToIndex.push(node)
		}
	}

	override complete() {
		for (let node of this.assignmentsToIndex) {
			let assignTo = transformContext.helper.assign.getToExpressions(node)
			
			for (let to of assignTo) {
				let hash = Hashing.hashNode(to)

				// Cache all assignment node position.
				this.assignmentMap.add(hash.key, node)
			}
		}
	}

	/** 
	 * Get the leaved scope list when walking from a scope to an ancestral scope.
	 * Note it normally includes `fromScope`, but not `toScope`.
	 */
	findWalkingOutwardLeaves(fromScope: DeclarationScope, toScope: DeclarationScope) : DeclarationScope[] {
		let scope: DeclarationScope | undefined = fromScope
		let leaves: DeclarationScope[] = []

		// Look outward for a node which can pass test.
		while (scope && scope !== toScope) {
			leaves.push(scope)
			scope = scope.parent!
		}

		return leaves
	}

	/** 
	 * Test whether can safely move a node before another node.
	 * E.g., `if {var a; a = 1}`, can't move `a = 1` to outer declaration scope.
	 */
	canSafelyMoveBeforeNode(fromNode: ts.Node, toNode: ts.Node): boolean {
		let hashed = Hashing.hashNode(fromNode)
		let fromScope = this.findClosest(fromNode)
		let toScope = toNode.parent ? this.findClosest(toNode.parent) : this.getTopmost()
		let scopesLeaves = this.findWalkingOutwardLeaves(fromScope, toScope)

		// Leaved scopes which contain any referenced variable.
		if (hashed.usedScopes.some(i => scopesLeaves.includes(i))) {
			return false
		}

		return true
	}
	
	/** Add a scope and a variable name to insert into the scope later. */
	addVariableToScope(scope: DeclarationScope, name: string) {
		this.addedVariableNames.add(scope, name)
	}

	/** Add variables to interpolator as declaration statements. */
	applyInterpolation() {
		for (let [scope, names] of this.addedVariableNames.entries()) {
			let toIndex = scope.getTargetNodeToAddStatements()

			let exps = transformContext.factory.createVariableDeclarationList(
				names.map(name => 
					transformContext.factory.createVariableDeclaration(
						transformContext.factory.createIdentifier(name),
						undefined,
						undefined,
						undefined
					)
				),
				ts.NodeFlags.Let
			)

			Interpolator.before(toIndex, InterpolationContentType.Declaration, () => exps)
		}
	}

	/** 
	 * Where later after `rawNode`, and before `beforeNode`, it will be assigned.
	 * Return the earliest assignment place.
	 */
	whereWillBeAssignedBefore(rawNode: AccessNode | ts.Identifier, beforeNode: ts.Node): AssignmentNode | undefined {
		let hashKey = Hashing.hashNode(rawNode).key
		let assignments = this.assignmentMap.get(hashKey)

		if (!assignments) {
			return undefined
		}

		for (let assign of assignments) {
	
			// Must assign after raw node.
			if (!VisitTree.isPrecedingOfInRunOrder(rawNode, assign)) {
				continue
			}

			// Assign before `beforeNode`.
			// For `for(;;i++) {}`, the `i++` runs after `{}`.
			if (!VisitTree.isPrecedingOfInRunOrder(assign, beforeNode)) {
				continue
			}
		
			return assign
		}

		return undefined
	}

	/** Test whether have assignment within a range. */
	hasAssignedWithinNodeRange(rawNode: AccessNode | ts.Identifier | ts.ThisExpression, withinNode: ts.Node): boolean {
		let hashKey = Hashing.hashNode(rawNode).key
		let assignments = this.assignmentMap.get(hashKey)

		if (!assignments) {
			return false
		}

		for (let assign of assignments) {
	
			// Assign node within node range.
			if (VisitTree.isAncestorOf(withinNode, assign)) {
				return true
			}
		}

		return false
	}

	/** Where before or after `rawNode`, it has or will be assigned. */
	haveOrWillBeAssigned(rawNode: AccessNode | ts.Identifier | ts.ThisExpression): boolean {
		let hashKey = Hashing.hashNode(rawNode).key
		return this.assignmentMap.hasKey(hashKey)
	}

	/** Get mutable musk from an expression represented value. */
	checkMask(rawNode: ts.Expression): MutableMask | 0 {
		if (this.nodeMutableMaskCache.has(rawNode)) {
			return this.nodeMutableMaskCache.get(rawNode)!
		}

		let mask = this.testMutableRecursively(rawNode, null)
		this.nodeMutableMaskCache.set(rawNode, mask)
		
		return mask
	}

	/** Overwrite mask for node, after know it will to be compiled into a callback. */
	overwriteMaskAsWithinCallback(rawNode: ts.Expression) {
		let mask = this.checkMask(rawNode)
		mask &= ~MutableMask.Mutable

		if (mask & MutableMask.HasLocalReferenceOutsideFunction) {
			mask &= ~MutableMask.HasLocalReferenceOutsideFunction
			mask |= MutableMask.HasLocalReferenceInsideFunction
		}

		this.nodeMutableMaskCache.set(rawNode, mask)
	}

	/** Test whether expression represented value is mutable. */
	testMutable(rawNode: ts.Expression): boolean {
		let mask = this.checkMask(rawNode)
		return (mask & MutableMask.Mutable) > 0
	}

	/** 
	 * Test whether can re-declare as static content to avoid updating each time.
	 * `asLazyCallback` means will be treated as a callback and will not be called immediately.
	 */
	testCanTransfer(rawNode: ts.Expression, asLazyCallback: boolean): boolean {
		let mask = this.checkMask(rawNode)
		let mutable = (mask & MutableMask.Mutable) > 0

		// If mutable, always can't transfer.
		if (mutable) {
			return false
		}

		// Can transfer as a callback, and local variable reference will be passed by `$latest_x`.
		// But if has local assignment, should replace it to a handler.
		// If have local reference, should replace it to a handler.
		if (asLazyCallback) {
			let hasLocalAssignment = (mask & MutableMask.HasLocalAssignment) > 0
			if (hasLocalAssignment) {
				return false
			}

			// Will visit the reference immediately, out of callback.
			let hasImmediateReference = (mask & MutableMask.HasLocalReferenceOutsideFunction) > 0
			if (hasImmediateReference) {
				return false
			}

			return true
		}

		// If have local reference, either inside or outside, can't transfer.
		let hasLocalReference = (mask & (MutableMask.HasLocalReferenceOutsideFunction | MutableMask.HasLocalReferenceInsideFunction)) > 0
		if (hasLocalReference) {
			return false
		}

		return true
	}

	private testMutableRecursively(rawNode: ts.Node, topmostFunction: ts.Node | null): MutableMask | 0{
		let mutable: MutableMask | 0 = 0

		// Inside of a function.
		if (!topmostFunction && transformContext.helper.isFunctionLike(rawNode)) {
			topmostFunction = rawNode
		}

		// Skip checking the library-owned node itself, but still recurse into its
		// children below. The receiver may be mutable, such as `getValues().length`.
		if (transformContext.helper.symbol.isOfTypescriptLib(rawNode)) {}

		// `this.method.bind(this)`
		else if (ts.isCallExpression(rawNode)
			&& ts.isPropertyAccessExpression(rawNode.expression)
			&& transformContext.helper.getText(rawNode.expression.name) === 'bind'
			&& transformContext.helper.symbol.resolveDeclaration(rawNode.expression.expression, transformContext.helper.isFunctionLike)
		) {
			mutable |= this.testMutableRecursively(rawNode.expression.expression, topmostFunction)
			
			for (let arg of rawNode.arguments) {
				mutable |= this.testMutableRecursively(arg, topmostFunction)
			}
		}

		// `a.b` or `a`
		else if (transformContext.helper.isVariableIdentifier(rawNode)
			|| transformContext.helper.access.isAccess(rawNode)
		) {
			let declaredInTopmostScope = this.isDeclaredInTopmostScope(rawNode)
			let asConst = this.isDeclaredAsConstLike(rawNode)
			let asVariable = transformContext.helper.isVariableIdentifier(rawNode)
			let asLocalVariable = asVariable && !declaredInTopmostScope
			let willBeAssigned = this.haveOrWillBeAssigned(rawNode)
			let notMutable = asConst || asVariable && !willBeAssigned

			// Mutable, here ignores situations that inside of a function.
			if (!notMutable && !topmostFunction) {
				mutable |= MutableMask.Mutable
			}

			// Have referenced local variable within range,
			// and to be declared outside of function range.
			if (asLocalVariable
				&& (!topmostFunction
					|| !this.isDeclaredWithinNodeRange(rawNode as ts.Identifier, rawNode, topmostFunction))
			) {
				if (topmostFunction) {
					mutable |= MutableMask.HasLocalReferenceInsideFunction
				}
				else {
					mutable |= MutableMask.HasLocalReferenceOutsideFunction
				}

				// If will be assigned within a handler.
				if (topmostFunction && this.hasAssignedWithinNodeRange(rawNode, topmostFunction)) {
					mutable |= MutableMask.HasLocalAssignment
				}
			}
		}

		ts.forEachChild(rawNode, (node: ts.Node) => {
			mutable |= this.testMutableRecursively(node, topmostFunction)
		})

		return mutable
	}

	/** 
	 * Test whether elements of expression represented value are mutable.
	 * Note it ignores testing whether `rawNode` itself is mutable.
	 */
	testElementsMutable(rawNode: ts.Expression): boolean {

		// Elements are readonly.
		if (transformContext.helper.types.isElementsReadonly(rawNode)) {
			return false
		}

		// `a.b` or `a`, can always append elements somewhere.
		if (transformContext.helper.isVariableIdentifier(rawNode)
			|| transformContext.helper.access.isAccess(rawNode)
		) {
			return true
		}

		return false
	}

	/** 
	 * Returns whether declared variable or access node in topmost scope.
	 * For global variables like `Math` will also returns `true`.
	 */
	private isDeclaredInTopmostScope(node: ts.Identifier | AccessNode | ts.ThisExpression): boolean {
		if (!VisitTree.hasNode(node)) {
			return false
		}
		else if (transformContext.helper.access.isAccess(node)) {
			let exp = node.expression
			return this.isDeclaredInTopmostScope(exp as ts.Identifier | AccessNode | ts.ThisExpression)
		}
		else if (transformContext.helper.isThis(node)) {
			return false
		}
		else if (ts.isIdentifier(node)) {
			let declaredIn = this.findDeclared(node)
			return declaredIn ? declaredIn.isTopmost() : true
		}
		else {
			return false
		}
	}

	/** Returns whether a variable node or an access node was declared as const. */
	private isDeclaredAsConstLike(rawNode: ts.Identifier | AccessNode | ts.ThisExpression): boolean {
		if (transformContext.helper.access.isAccess(rawNode)) {
			let readonly = transformContext.helper.symbol.resolveDeclaration(rawNode, transformContext.helper.isPropertyLike) && transformContext.helper.types.isReadonly(rawNode)
			let beMethod = transformContext.helper.symbol.resolveDeclaration(rawNode, transformContext.helper.isMethodLike) && !ts.isCallExpression(rawNode.parent)

			if (!readonly && !beMethod) {
				return false
			}

			let exp = rawNode.expression
			return this.isDeclaredAsConstLike(exp as ts.Identifier | AccessNode | ts.ThisExpression)
		}
		else if (transformContext.helper.isThis(rawNode)) {
			return true
		}
		else if (ts.isIdentifier(rawNode)) {
			let scope = this.findDeclared(rawNode)
			return scope ? scope.isLocalVariableConstLike(rawNode.text) : false
		}
		else {
			return false
		}
	}

	/** Returns whether a node is declared within target node. */
	private isDeclaredWithinNodeRange(node: ts.Identifier, fromRawNode: ts.Node, targetNode: ts.Node): boolean {
		let declaredIn = this.findDeclared(node, this.findClosest(fromRawNode))
		if (!declaredIn) {
			return false
		}

		return VisitTree.isContains(targetNode, declaredIn.node)
	}


	/** 
	 * Transfer a raw or replaced node to top scope,
	 * output a new node, and a referenced variable list.
	 * `replacer` can help to modify node when doing transfer,
	 * it replace local variables and `this` to some parameters.
	 */
	transferToTopmostScope<T extends ts.Node>(
		node: T,
		rawNode: ts.Node,
		replacer: NodeReplacer
	): T {
		return this.transferToTopmostScopeVisitor(
			node,
			VisitTree.hasNode(node) ? node : rawNode,
			rawNode,
			replacer,
			true,
			false
		) as T
	}

	private transferToTopmostScopeVisitor(
		node: ts.Node,
		closestRawNode: ts.Node,
		topRawNode: ts.Node,
		replacer: NodeReplacer,
		canReplaceThis: boolean,
		insideFunctionScope: boolean
	): ts.Node {

		// Inside of a function scope.
		insideFunctionScope ||= transformContext.helper.isFunctionLike(node)
		
		// Raw variable.
		// Can't rightly checking whether be variable identifier for non-raw.
		if (VisitTree.hasNode(node) && transformContext.helper.isVariableIdentifier(node)) {

			// If declared in top scope, can still visit after transferred,
			// no need to replace it.

			// If declared in local scope within transferring content,
			// like variables in a local declared function,
			// will be transferred with the transferring content together.

			let isDeclaredWithinTransferring = this.isDeclaredWithinNodeRange(node, node, topRawNode)
			let shouldNotReplace = this.isDeclaredInTopmostScope(node) || isDeclaredWithinTransferring
			if (!shouldNotReplace) {
				return replacer(node, closestRawNode, insideFunctionScope)
			}
		}

		// Non-raw identifier.
		else if (!VisitTree.hasNode(node) && ts.isIdentifier(node)) {
			let declaredIn = this.findDeclared(node, this.findClosest(closestRawNode))
			if (declaredIn) {
				let isDeclaredWithinTransferring = VisitTree.isContains(topRawNode, declaredIn.node)
				let shouldNotReplace = isDeclaredWithinTransferring
				if (!shouldNotReplace) {
					return replacer(node, closestRawNode, insideFunctionScope)
				}
			}
		}

		// `this`.
		else if (canReplaceThis && transformContext.helper.isThis(node)) {
			return replacer(node as ts.ThisExpression, closestRawNode, insideFunctionScope)
		}

		// If enters non-arrow function declaration, cause can't replace `this`, otherwise can.
		canReplaceThis &&= !transformContext.helper.isNonArrowFunctionLike(node)

		return ts.visitEachChild(node, (n: ts.Node) => {
			return this.transferToTopmostScopeVisitor(
				n,
				VisitTree.hasNode(n) ? n : closestRawNode,
				topRawNode,
				replacer,
				canReplaceThis,
				insideFunctionScope
			)
		}, transformContext.transformationContext)
	}
}


export let DeclarationScopeTree: ExtendedScopeTree

defineSourceFilePrepass({
	initialize: sourceFile => {
		DeclarationScopeTree = new ExtendedScopeTree()
		DeclarationScopeTree.initialize(sourceFile)
	},
	enter: node => DeclarationScopeTree.toChild(node),
	leave: node => DeclarationScopeTree.toParent(node),
	complete: () => DeclarationScopeTree.complete(),
})

definePostVisitCallback(() => DeclarationScopeTree.applyInterpolation())
