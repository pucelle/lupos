import * as ts from 'typescript'
import {addToList, ListMap} from '../utils'
import {factory, sourceFile, transformContext, helper} from './global'
import {VisitTree} from './visit-tree'
import {InterpolationContentType, Interpolator} from './interpolator'
import {AccessNode} from '../lupos-ts-module'
import {definePostVisitCallback, definePreVisitCallback} from './visitor-callbacks'
import {Scope} from './scope'
import {Packer} from './packer'


export interface HashItem {

	/** Unique name. */
	name: string

	/** The variable declaration scopes that current node used. */
	usedScopes: Scope[]

	/** The variable declaration visit indices that current node used. */
	usedIndices: number[]
}


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


export namespace ScopeTree {

	let stack: Scope[] = []
	let current: Scope | null = null

	/** Visit index -> scope. */
	const ScopeMap: Map<number, Scope> = new Map()

	/** Visit index -> node hash result. */
	const HashMap: Map<number, HashItem> = new Map()

	/** Cache assignment expression hash name -> node. */
	const AssignmentMap: ListMap<string, number> = new ListMap()

	/** All added variable names, via scope. */
	const AddedVariableNames: ListMap<Scope, string> = new ListMap()


	/** Initialize before visiting a new source file. */
	export function initialize() {
		stack = []
		current = null
		ScopeMap.clear()
		HashMap.clear()
		AssignmentMap.clear()
		AddedVariableNames.clear()
	}


	/** To next sibling. */
	export function toNext(node: ts.Node) {
		let index = VisitTree.getIndex(node)

		if (ts.isSourceFile(node)
			|| helper.isFunctionLike(node)
			|| ts.isForStatement(node)
			|| ts.isForOfStatement(node)
			|| ts.isForInStatement(node)
			|| ts.isBlock(node)
		) {
			current = new Scope(node, index, stack.length > 0 ? stack[stack.length - 1] : null)
			ScopeMap.set(index, current)
		}
		else {
			current!.visitNode(node)
		}
	}

	/** To first child. */
	export function toChild() {
		stack.push(current!)
	}

	/** To parent. */
	export function toParent(currentNode: ts.Node) {

		// Must after visited all descendant nodes.
		// Assignment expressions like `a.b = c`
		if (helper.assign.isAssignment(currentNode)) {
			let assignTo = helper.assign.getToExpressions(currentNode)
			
			for (let to of assignTo) {
				let hash = hashNode(to)

				// Cache all assign node position.
				AssignmentMap.add(hash.name, VisitTree.getIndex(currentNode))
			}
		}
		
		current = stack.pop()!
	}


	/** Get top most scope, the scope of source file. */
	export function getTopmost(): Scope {
		return ScopeMap.get(VisitTree.getIndex(sourceFile))!
	}
	

	/** Find closest scope contains or equals node with specified visit index. */
	export function findClosest(index: number): Scope {
		let scope = ScopeMap.get(index)

		while (!scope) {
			index = VisitTree.getParentIndex(index)!
			scope = ScopeMap.get(index)
		}

		return scope
	}


	/** Find closest scope contains or equals node. */
	export function findClosestByNode(node: ts.Node): Scope {
		return findClosest(VisitTree.getIndex(node))
	}


	/** Get the leaved scope list when walking from a scope to an ancestral scope. */
	export function findWalkingOutwardLeaves(fromScope: Scope, toScope: Scope) : Scope[] {
		let scope: Scope | undefined = fromScope
		let leaves: Scope[] = []

		// Look outward for a node which can pass test.
		while (scope && scope !== toScope) {
			leaves.push(scope)
			scope = scope.parent!
		}

		return leaves
	}
	

	/** Add a scope and a variable name to insert into the scope later. */
	export function addVariableToScope(scope: Scope, name: string) {
		AddedVariableNames.add(scope, name)
	}

	
	/** Add variables to interpolator as declaration statements. */
	export function applyInterpolation() {
		for (let [scope, names] of AddedVariableNames.entries()) {
			let toIndex = scope.getIndexToAddStatements()

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
	 * Get hash of raw node, which has a visit index.
	 * Note hashing will transform `a?.b` -> `a.b`.
	 */
	export function hashNode(rawNode: ts.Node): HashItem {
		let index = VisitTree.getIndex(rawNode)
		return hashIndex(index)
	}

	/** 
	 * Get hash of node at the specified visit index.
	 * Note hashing will transform `a?.b` -> `a.b`.
	 */
	export function hashIndex(index: number): HashItem {
		if (HashMap.has(index)) {
			return HashMap.get(index)!
		}

		let hashed = doHashingOfNode(VisitTree.getNode(index))
		HashMap.set(index, hashed)

		return hashed
	}

	/** Hash a node, normalize and add a unique suffix to all variable nodes. */
	function doHashingOfNode(rawNode: ts.Node): HashItem {
		let usedScopes: Scope[] = []
		let usedIndices: number[] = []
		let node = rawNode

		let hashVisited = ts.visitNode(node, (n: ts.Node) => {
			return hashNodeVisitor(n, usedScopes, usedIndices)
		})!

		node = Packer.normalize(hashVisited, true)

		return {
			name: helper.getFullText(node),
			usedScopes,
			usedIndices,
		}
	}

	function hashNodeVisitor(node: ts.Node, usedScopes: Scope[], usedIndices: number[]): ts.Node | undefined {

		// Not raw node.
		if (!VisitTree.hasNode(node)) {}

		// a -> a_123
		else if (helper.isVariableIdentifier(node)) {
			let {name, scope} = hashVariableName(node)
			let declNode = scope.getDeclarationByName(node.text)

			addToList(usedScopes, scope)

			if (declNode) {
				usedIndices.push(VisitTree.getIndex(declNode))
			}

			return factory.createIdentifier(name)
		}

		// this -> this_123
		else if (helper.isThis(node)) {
			let {name, scope} = hashVariableName(node as ts.ThisExpression)
			addToList(usedScopes, scope)

			return factory.createIdentifier(name)
		}

		// `a?.b` -> `a.b`
		else if (node.kind === ts.SyntaxKind.QuestionDotToken) {
			return undefined
		}

		return ts.visitEachChild(node, (n: ts.Node) => hashNodeVisitor(n, usedScopes, usedIndices), transformContext)
	}

	/** 
	 * Hash a node by replace variable name or `this` to add a suffix.
	 * The suffix is normally a scope visit index,
	 * then the hashing is unique across whole source file.
	 */
	function hashVariableName(rawNode: ts.Identifier | ts.ThisExpression): {name: string, scope: Scope} {
		let scope = findDeclaredScope(rawNode) || findClosestByNode(rawNode)
		let name = helper.getFullText(rawNode)
		let suffix = scope.visitIndex

		return {
			name: name + '_' + suffix,
			scope,
		}
	}


	/** 
	 * Where later after `rawNode`, it will be assigned.
	 * Return the earliest assign visit index.
	 */
	export function whereWillBeAssigned(rawNode: AccessNode | ts.Identifier | ts.ThisExpression): number | undefined {
		let hashName = ScopeTree.hashNode(rawNode).name
		let assignments = AssignmentMap.get(hashName)
		let nodeIndex = VisitTree.getIndex(rawNode)

		if (!assignments) {
			return undefined
		}

		for (let assignIndex of assignments) {
			if (VisitTree.isPrecedingOfInChildFirstOrder(nodeIndex, assignIndex)) {
				return assignIndex
			}
		}

		return undefined
	}


	/** Where before or after `rawNode`, it has or will be assigned. */
	export function haveOrWillBeAssigned(rawNode: AccessNode | ts.Identifier | ts.ThisExpression): boolean {
		let hashName = ScopeTree.hashNode(rawNode).name
		return AssignmentMap.hasOf(hashName)
	}


	/** 
	 * Try get raw node by variable name.
	 * `fromRawNode` specifies where to query the variable from.
	 */
	export function getDeclarationByName(name: string, fromRawNode: ts.Node): ts.Node | undefined {
		let scope = findClosestByNode(fromRawNode)
		if (!scope) {
			return undefined
		}

		return scope.getDeclarationByName(name)
	}
	
	
	/** Check at which scope the specified named variable or this declared. */
	export function findDeclaredScope(rawNode: ts.Identifier | ts.ThisExpression, fromScope = findClosestByNode(rawNode)): Scope | null {
		if (helper.isThis(rawNode)) {
			return fromScope.findClosestThisScope()
		}
		else if (fromScope.hasLocalVariable(rawNode.text)) {
			return fromScope
		}
		else if (fromScope.parent) {
			return findDeclaredScope(rawNode, fromScope.parent!)
		}
		else {
			return null
		}
	}


	/** Returns whether declared variable or access node in topmost scope. */
	function isDeclaredInTopmostScope(rawNode: ts.Identifier | AccessNode | ts.ThisExpression): boolean {
		if (helper.access.isAccess(rawNode)) {
			let exp = rawNode.expression
			return isDeclaredInTopmostScope(exp as ts.Identifier | AccessNode | ts.ThisExpression)
		}
		else if (helper.isThis(rawNode)) {
			return false
		}
		else if (ts.isIdentifier(rawNode)) {
			let declaredIn = findDeclaredScope(rawNode)
			return declaredIn ? declaredIn.isTopmost() : false
		}
		else {
			return false
		}
	}

	/** Returns whether a variable node or an access node was declared as const. */
	function isDeclaredAsConstLike(rawNode: ts.Identifier | AccessNode | ts.ThisExpression): boolean {
		if (helper.access.isAccess(rawNode)) {
			let readonly = helper.symbol.resolveDeclaration(rawNode, helper.isPropertyLike) && helper.types.isReadonly(rawNode)
			let beMethod = helper.symbol.resolveDeclaration(rawNode, helper.isMethodLike) && !ts.isCallExpression(rawNode.parent)

			if (!readonly && !beMethod) {
				return false
			}

			let exp = rawNode.expression
			return isDeclaredAsConstLike(exp as ts.Identifier | AccessNode | ts.ThisExpression)
		}
		else if (helper.isThis(rawNode)) {
			return true
		}
		else if (ts.isIdentifier(rawNode)) {
			let scope = findDeclaredScope(rawNode)
			return scope ? scope.isLocalVariableConstLike(rawNode.text) : false
		}
		else {
			return false
		}
	}

	/** Returns whether a node is declared within target node. */
	function isDeclaredWithinNodeRange(rawNode: ts.Identifier, targetNode: ts.Node): boolean {
		let declaredIn = findDeclaredScope(rawNode)
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


	/** Test whether expression represented value is mutable. */
	export function testMutable(rawNode: ts.Expression): MutableMask | 0 {
		return testMutableVisitor(rawNode, false)
	}

	function testMutableVisitor(rawNode: ts.Node, insideFunctionScope: boolean): MutableMask | 0{
		let mutable: MutableMask | 0 = 0

		// Inside of a function scope.
		insideFunctionScope ||= helper.isFunctionLike(rawNode)

		// Com from typescript library.
		if (helper.symbol.isOfTypescriptLib(rawNode)) {}

		// `a.b` or `a`
		if (helper.isVariableIdentifier(rawNode)
			|| helper.access.isAccess(rawNode)
		) {

			let declaredInTopmostScope = isDeclaredInTopmostScope(rawNode)
			let declaredAsConst = isDeclaredAsConstLike(rawNode)

			// Local variable, and it has or will be assigned.
			if (helper.isVariableIdentifier(rawNode) && haveOrWillBeAssigned(rawNode)) {
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

		ts.visitEachChild(rawNode, (node: ts.Node) => {
			mutable |= testMutableVisitor(node, insideFunctionScope)
			return node
		}, transformContext)

		return mutable
	}


	/** Replace an identifier or this keyword. */
	type NodeReplacer = (node: ts.Identifier | ts.ThisExpression, insideFunctionScope: boolean) => ts.Expression

	/** 
	 * Transfer a raw or replaced node to top scope,
	 * output a new node, and a referenced variable list.
	 * `replacer` can help to modify node when doing transfer,
	 * it replace local variables and `this` to some parameters.
	 */
	export function transferToTopmostScope<T extends ts.Node>(
		node: T,
		rawNode: ts.Node,
		replacer: NodeReplacer
	): T {
		return transferToTopmostScopeVisitor(node, rawNode, true, replacer, false) as T
	}

	function transferToTopmostScopeVisitor(
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

			let isDeclaredWithinTransferring = isDeclaredWithinNodeRange(node, rawTopNode)
			let shouldNotReplace = isDeclaredInTopmostScope(node) || isDeclaredWithinTransferring
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
			return transferToTopmostScopeVisitor(node, rawTopNode, canReplaceThis, replacer, insideFunctionScope)
		}, transformContext)
	}
}


definePreVisitCallback(ScopeTree.initialize)
definePostVisitCallback(ScopeTree.applyInterpolation)
