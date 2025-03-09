import * as ts from 'typescript'
import {factory, transformContext, helper, sourceFile} from './global'
import {VisitTree} from './visit-tree'
import {InterpolationContentType, Interpolator} from './interpolator'
import {AccessNode, AssignmentNode, ListMap, ScopeTree} from '../lupos-ts-module'
import {definePostVisitCallback, definePreVisitCallback} from './visitor-callbacks'
import {DeclarationScope} from './scope'
import {Hashing} from './hashing'


/** Whether a expression be mutable, and whether it can turn. */
export enum MutableMask {

	/** If referenced variable value is mutable, and need to update for multiple times. */
	Mutable = 1,

	/** 
	 * Can (not can't) turn static means can re-declared a local variable,
	 * normally a local function in top scope, and transfer all of it's
	 * referenced local variables using parameter values.
	 * 
	 * If references any local variable not within a function, this mask byte is 1.
	 * 
	 * This mask byte is available only when Mutable byte is 1.
	 */
	CantTransfer = 2,
}

/** Replace an identifier or this keyword. */
type NodeReplacer = (node: ts.Identifier | ts.ThisExpression, insideFunctionScope: boolean) => ts.Expression


/** Manages all the declaration scopes as a tree struct. */
class ExtendedScopeTree extends ScopeTree<DeclarationScope> {

	/** Cache assign to hash name -> assignment expression. */
	private assignmentMap: ListMap<string, AssignmentNode> = new ListMap()

	/** All added variable names, via scope. */
	private addedVariableNames: ListMap<DeclarationScope, string> = new ListMap()

	constructor() {
		super(helper, DeclarationScope)
	}

	/** To parent. */
	protected toParent(node: ts.Node) {
		super.toParent(node)

		// Must after visited all descendant nodes.
		// Assignment expressions like `a.b = c`
		if (helper.assign.isAssignment(node)) {
			let assignTo = helper.assign.getToExpressions(node)
			
			for (let to of assignTo) {
				let hash = Hashing.hashNode(to)

				// Cache all assignment node position.
				this.assignmentMap.add(hash.name, node)
			}
		}
	}

	/** Get the leaved scope list when walking from a scope to an ancestral scope. */
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

			let exps = factory.createVariableDeclarationList(
				names.map(name => 
					factory.createVariableDeclaration(
						factory.createIdentifier(name),
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
		let hashName = Hashing.hashNode(rawNode).name
		let assignments = this.assignmentMap.get(hashName)

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

	/** Where before or after `rawNode`, it has or will be assigned. */
	haveOrWillBeAssigned(rawNode: AccessNode | ts.Identifier | ts.ThisExpression): boolean {
		let hashName = Hashing.hashNode(rawNode).name
		return this.assignmentMap.hasKey(hashName)
	}

	/** Test whether expression represented value is mutable. */
	testMutable(rawNode: ts.Expression): MutableMask | 0 {
		return this.testMutableRecursively(rawNode, false)
	}

	private testMutableRecursively(rawNode: ts.Node, insideFunctionScope: boolean): MutableMask | 0{
		let mutable: MutableMask | 0 = 0

		// Inside of a function scope.
		insideFunctionScope ||= helper.isFunctionLike(rawNode)

		// Com from typescript library.
		if (helper.symbol.isOfTypescriptLib(rawNode)) {}

		// `this.method.bind(this)`
		else if (ts.isCallExpression(rawNode)
			&& ts.isPropertyAccessExpression(rawNode.expression)
			&& helper.getText(rawNode.expression.name) === 'bind'
			&& helper.symbol.resolveDeclaration(rawNode.expression.expression, helper.isFunctionLike)
		) {
			mutable |= this.testMutableRecursively(rawNode.expression.expression, insideFunctionScope)
			
			for (let arg of rawNode.arguments) {
				mutable |= this.testMutableRecursively(arg, insideFunctionScope)
			}
		}

		// `a.b` or `a`
		else if (helper.isVariableIdentifier(rawNode)
			|| helper.access.isAccess(rawNode)
		) {

			let declaredInTopmostScope = this.isDeclaredInTopmostScope(rawNode)
			let declaredAsConst = this.isDeclaredAsConstLike(rawNode)

			// Local variable, and it has or will be assigned.
			if (helper.isVariableIdentifier(rawNode) && this.haveOrWillBeAssigned(rawNode)) {
				mutable |= MutableMask.Mutable
				mutable |= MutableMask.CantTransfer
			}

			// Declared as const, or reference at a function, not mutable.
			// If inside a function but also inside an assignment, not ignore it.
			else if (declaredAsConst || insideFunctionScope) {}

			// If reference variable in function scope, become mutable, and can transfer.
			// If declared in topmost scope, also mutable, and can transfer.
			else if (declaredInTopmostScope) {
				mutable |= MutableMask.Mutable
			}

			// Become mutable and can't transfer.
			else {
				mutable |= MutableMask.Mutable
				mutable |= MutableMask.CantTransfer
			}
		}

		ts.forEachChild(rawNode, (node: ts.Node) => {
			mutable |= this.testMutableRecursively(node, insideFunctionScope)
		})

		return mutable
	}

	/** 
	 * Test whether elements of expression represented value are mutable.
	 * Note it ignores testing whether `rawNode` itself is mutable.
	 */
	testElementsPartMutable(rawNode: ts.Expression): boolean {

		// Elements are readonly.
		if (helper.types.isElementsReadonly(rawNode)) {
			return false
		}

		// `a.b` or `a`, can always append elements somewhere.
		if (helper.isVariableIdentifier(rawNode)
			|| helper.access.isAccess(rawNode)
		) {
			return true
		}

		return false
	}

	/** Returns whether declared variable or access node in topmost scope. */
	private isDeclaredInTopmostScope(rawNode: ts.Identifier | AccessNode | ts.ThisExpression): boolean {
		if (helper.access.isAccess(rawNode)) {
			let exp = rawNode.expression
			return this.isDeclaredInTopmostScope(exp as ts.Identifier | AccessNode | ts.ThisExpression)
		}
		else if (helper.isThis(rawNode)) {
			return false
		}
		else if (ts.isIdentifier(rawNode)) {
			let declaredIn = this.findDeclared(rawNode)
			return declaredIn ? declaredIn.isTopmost() : false
		}
		else {
			return false
		}
	}

	/** Returns whether a variable node or an access node was declared as const. */
	private isDeclaredAsConstLike(rawNode: ts.Identifier | AccessNode | ts.ThisExpression): boolean {
		if (helper.access.isAccess(rawNode)) {
			let readonly = helper.symbol.resolveDeclaration(rawNode, helper.isPropertyLike) && helper.types.isReadonly(rawNode)
			let beMethod = helper.symbol.resolveDeclaration(rawNode, helper.isMethodLike) && !ts.isCallExpression(rawNode.parent)

			if (!readonly && !beMethod) {
				return false
			}

			let exp = rawNode.expression
			return this.isDeclaredAsConstLike(exp as ts.Identifier | AccessNode | ts.ThisExpression)
		}
		else if (helper.isThis(rawNode)) {
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
	private isDeclaredWithinNodeRange(rawNode: ts.Identifier, targetNode: ts.Node): boolean {
		let declaredIn = this.findDeclared(rawNode)
		if (!declaredIn) {
			return false
		}

		let n: ts.Node = declaredIn.node

		do {
			if (n === targetNode) {
				return true
			}

			n = n.parent
		} while (n)

		return false
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
		return this.transferToTopmostScopeVisitor(node, rawNode, true, replacer, false) as T
	}

	private transferToTopmostScopeVisitor(
		node: ts.Node,
		rawTopNode: ts.Node,
		canReplaceThis: boolean,
		replacer: NodeReplacer,
		insideFunctionScope: boolean
	): ts.Node {

		// Inside of a function scope.
		insideFunctionScope ||= helper.isFunctionLike(node)
		
		// Raw variable
		if (VisitTree.hasNode(node) && helper.isVariableIdentifier(node)) {

			// If declared in top scope, can still visit after transferred,
			// no need to replace it.

			// If declared in local scope within transferring content,
			// will be transferred with template together.

			let isDeclaredWithinTransferring = this.isDeclaredWithinNodeRange(node, rawTopNode)
			let shouldNotReplace = this.isDeclaredInTopmostScope(node) || isDeclaredWithinTransferring
			if (!shouldNotReplace) {
				return replacer(node, insideFunctionScope)
			}
		}

		// this
		else if (canReplaceThis && helper.isThis(node)) {
			return replacer(node as ts.ThisExpression, insideFunctionScope)
		}

		// If enters non-arrow function declaration, cause can't replace `this`, otherwise can't.
		canReplaceThis &&= !helper.isNonArrowFunctionLike(node)

		return ts.visitEachChild(node, (node: ts.Node) => {
			return this.transferToTopmostScopeVisitor(node, rawTopNode, canReplaceThis, replacer, insideFunctionScope)
		}, transformContext)
	}
}


export let DeclarationScopeTree: ExtendedScopeTree

definePreVisitCallback(() => {
	DeclarationScopeTree = new ExtendedScopeTree()
	DeclarationScopeTree.visitSourceFile(sourceFile)
})

definePostVisitCallback(() => DeclarationScopeTree.applyInterpolation())
