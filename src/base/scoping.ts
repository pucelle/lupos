import type TS from 'typescript'
import {addToList, ListMap} from '../utils'
import {factory, transformContext, ts} from './global'
import {Visiting} from './visiting'
import {InterpolationContentType, Interpolator} from './interpolator'
import {Helper} from './helper'


interface HashItem {

	/** Unique name. */
	name: string

	/** The variable visiting indices current node referenced. */
	referenceIndices: number[]
}


/** Whether a expression be mutable, and whether it can turn. */
export enum MutableMask {

	/** `1`, use `const a`, use `import a`, use global declared `a`, `this.onClick`. */
	Static = 0,

	/** use local variable `a`. */
	Mutable = 1,

	/** Have some variable using directly, but not use them inside a function. */
	CantTurnStatic = 2,
}


export namespace Scoping {

	let stack: Scope[] = []
	export let current: Scope | null = null

	/** Visiting index -> scope. */
	const ScopeMap: Map<number, Scope> = new Map()

	/** Visiting index -> node hash result. */
	const HashMap: Map<number, HashItem> = new Map()

	/** All added variable names, via scope. */
	const AddedVariableNames: ListMap<Scope, string> = new ListMap()


	/** Initialize before visiting a new source file. */
	export function init() {
		stack = []
		current = null
		ScopeMap.clear()
		HashMap.clear()
		AddedVariableNames.clear()
	}


	/** To next sibling. */
	export function toNext(node: TS.Node) {
		let index = Visiting.getIndex(node)

		if (ts.isSourceFile(node)) {
			current = new Scope(node, index, null)
			ScopeMap.set(index, current)
		}
		else if (Helper.isFunctionLike(node)
			|| ts.isForStatement(node)
			|| ts.isBlock(node)
		) {
			current = new Scope(node, index, stack[stack.length - 1])
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
	export function toParent() {
		current = stack.pop()!
	}
	

	/** Find closest scope contains node with specified visiting index. */
	export function findClosestScope(index: number): Scope {
		let scope = ScopeMap.get(index)

		while (!scope) {
			index = Visiting.getParentIndex(index)!
			scope = ScopeMap.get(index)
		}

		return scope
	}


	/** Find closest scope contains node. */
	export function findClosestScopeOfNode(node: TS.Node): Scope {
		return findClosestScope(Visiting.getIndex(node))
	}

	
	/** 
	 * Find an ancestral scope, and a child visiting index,
	 * which can insert variable before it.
	 */
	export function findClosestScopeToAddVariable(fromIndex: number): Scope {
		let scope = findClosestScope(fromIndex)
		while (!scope.canAddStatements()) {
			scope = scope.parent!
		}

		return scope
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
	export function addVariable(scope: Scope, name: string) {
		AddedVariableNames.add(scope, name)
	}

	/** Add variables to interpolator as declaration statements. */
	export function apply() {
		for (let [scope, names] of AddedVariableNames.entries()) {
			let toIndex = scope.getIndexToAddVariable()

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

			Interpolator.before(toIndex, InterpolationContentType.VariableDeclaration, () => exps)
		}
	}


	/** 
	 * Get hash of node.
	 * Note hashing will transform `a?.b` -> `a.b`.
	 */
	export function hashNode(node: TS.Node): HashItem {
		let index = Visiting.getIndex(node)
		return hashIndex(index)
	}

	/** 
	 * Get hash of node at the specified visiting index.
	 * Note hashing will transform `a?.b` -> `a.b`.
	 */
	export function hashIndex(index: number): HashItem {
		if (HashMap.has(index)) {
			return HashMap.get(index)!
		}

		let hashed = doHashingOfNode(Visiting.getNode(index))
		HashMap.set(index, hashed)

		return hashed
	}

	/** 
	 * Hash a node, normalize and add a unique suffix to all variable nodes.
	 * `maximumReferencedIndex` means: if you want to move this node,
	 * it can't be moved before node with visiting index >= this value. 
	 */
	function doHashingOfNode<T extends TS.Node>(node: T): HashItem {
		let referenceIndices: number[] = []

		node = Helper.pack.normalize(
			ts.visitNode(node, (n: TS.Node) => {
				return hashVisitNode(n, referenceIndices)
			})!,
			true
		) as T

		return {
			name: Helper.getText(node),
			referenceIndices,
		}
	}

	function hashVisitNode(node: TS.Node, referenceIndices: number[]): TS.Node | undefined {
		if (Helper.variable.isVariableIdentifier(node)) {
			let hashed = hashVariableName(node)
			addToList(referenceIndices, hashed.suffix)

			return factory.createIdentifier(hashed.name)
		}

		// `a?.b` -> `a.b`
		else if (node.kind === ts.SyntaxKind.QuestionDotToken) {
			return undefined
		}

		return ts.visitEachChild(node, (n: TS.Node) => hashVisitNode(n, referenceIndices), transformContext)
	}

	/** 
	 * Hash a node by replace variable names `a` to add a suffix.
	 * The suffix is normally a scope visiting index,
	 * then the hashing is unique across whole source file.
	 */
	function hashVariableName(node: TS.Identifier): {name: string, suffix: number} {
		let name = node.text
		let scope = findDeclaredScope(node) || findClosestScopeOfNode(node)
		let suffix = scope.visitingIndex

		return {
			name: name + '_' + suffix,
			suffix,
		}
	}
	
	
	/** Check at which scope the specified named variable declared. */
	export function findDeclaredScope(node: TS.Identifier, fromScope = findClosestScopeOfNode(node)): Scope | null {
		if (fromScope.hasLocalVariable(node.text)) {
			return fromScope
		}
		else if (fromScope.parent) {
			return findDeclaredScope(node, fromScope.parent!)
		}
		else {
			return null
		}
	}

	/** Returns whether declared variable at top (source file) scope. */
	function isDeclaredInTopScope(node: TS.Identifier): boolean {
		let declaredIn = findDeclaredScope(node)
		return declaredIn ? declaredIn.isTopmost() : false
	}

	/** Returns whether declared in a target scope, and descendant scope of target scope. */
	function isDeclaredWithinScope(node: TS.Identifier, scope: Scope): boolean {
		let declaredIn = findDeclaredScope(node)
		return declaredIn ? scope.isSelfOrAncestorOf(declaredIn) : false
	}

	/** Returns whether a variable node was declared as const. */
	function isDeclaredAsConst(node: TS.Identifier): boolean {
		let scope = findDeclaredScope(node)
		return scope ? scope.isLocalVariableConst(node.text) : false
	}


	/** Test whether expression represented value is mutable. */
	export function testMutable(node: TS.Expression): MutableMask {
		return visitNodeTestMutable(node, false)
	}

	function visitNodeTestMutable(node: TS.Node, inFunction: boolean): MutableMask {
		let mutable = 0

		// Inside of a function
		inFunction ||= Helper.isFunctionLike(node)

		// Variable
		if (Helper.variable.isVariableIdentifier(node)) {

			// If in child scope, become mutable only when uses a local variable.
			// Which means: the variable should not been declared in top scope.
			if (inFunction) {
				let declaredInTopmostScope = isDeclaredInTopScope(node)

				// Should apply mutable and not applied.
				if (!declaredInTopmostScope) {
					mutable |= MutableMask.Mutable
				}
			}

			// Otherwise become mutable except not const defined.
			else {
				let constDeclared = isDeclaredAsConst(node)
				if (!constDeclared) {
					mutable |= MutableMask.Mutable
					mutable |= MutableMask.CantTurnStatic
				}
			}
		}

		// Readonly, or method.
		// If in a child scope, all property visiting is not mutable.
		else if (Helper.access.isAccess(node) && !inFunction) {

			// Use method, but not call it.
			let useNotCalledMethod = Helper.symbol.resolveMethod(node) && !ts.isCallExpression(node.parent)

			// Use readonly property.
			let useReadonlyProperty = Helper.symbol.resolveProperty(node) && Helper.types.isReadonly(node)

			if (!(useNotCalledMethod || useReadonlyProperty)) {
				mutable |= MutableMask.Mutable

				if (!inFunction) {
					mutable |= MutableMask.CantTurnStatic
				}
			}
		}

		ts.visitEachChild(node, (node: TS.Node) => {
			mutable |= visitNodeTestMutable(node, inFunction)
			return node
		}, transformContext)

		return mutable
	}


	/** Replace an identifier or this keyword. */
	type NodeReplacer = (node: TS.Identifier | TS.ThisExpression) => TS.Expression

	/** 
	 * Transfer a node to top scope, output a new node, and a reference variable list.
	 * `replacer` can help to modify node when doing transfer,
	 * it replace local variables and `this` to some parameters.
	 */
	export function transferToTopmostScope<T extends TS.Node>(node: T, replacer: NodeReplacer): T {
		let scope = findClosestScopeOfNode(node)
		return visitNodeTransferToTopmost(node, scope, true, replacer) as T
	}

	function visitNodeTransferToTopmost(node: TS.Node, scope: Scope, canReplaceThis: boolean, replacer: NodeReplacer): TS.Node {

		// Variable
		if (Helper.variable.isVariableIdentifier(node)) {

			// If declared in top scope, or in local scope within transfer content, not replace it.
			if (!isDeclaredInTopScope(node) && !isDeclaredWithinScope(node, scope)) {
				return replacer(node)
			}
		}

		// this
		else if (canReplaceThis && node.kind === ts.SyntaxKind.ThisKeyword) {
			return replacer(node as TS.ThisExpression)
		}

		// If enters non-arrow function declaration, cant replace this.
		canReplaceThis &&= Helper.isFunctionLike(node) && !ts.isArrowFunction(node)

		return ts.visitEachChild(node, (node: TS.Node) => {
			return visitNodeTransferToTopmost(node, scope, canReplaceThis, replacer)
		}, transformContext)
	}
}


/** Mark all variables with a context. */
export class Scope {

	readonly node: TS.FunctionLikeDeclaration | TS.ForStatement | TS.Block | TS.SourceFile
	readonly parent: Scope | null
	readonly visitingIndex: number

	/** All variables declared here. */
	private variables: Map<string, TS.Node | null> = new Map()

	constructor(
		node: TS.FunctionLikeDeclaration | TS.ForStatement | TS.Block | TS.SourceFile,
		index: number,
		parent: Scope | null
	) {
		this.node = node
		this.parent = parent
		this.visitingIndex = index
	}

	/** Visit a descendant node. */
	visitNode(node: TS.Node) {

		// Variable declaration.
		if (ts.isVariableDeclaration(node)) {
			for (let name of Helper.variable.walkDeclarationNames(node)) {
				this.variables.set(name, node)
			}
		}

		// Parameter.
		else if (ts.isParameter(node)) {
			this.variables.set(Helper.getText(node.name), node)
		}

		// `import {a as b}`,  `import {a}`
		else if (ts.isImportSpecifier(node)) {
			this.variables.set(Helper.getText(node.name), node)
		}

		// `import a`
		else if (ts.isImportClause(node)) {
			if (node.name) {
				this.variables.set(Helper.getText(node.name), node)
			}
		}

		// `import * as a`
		else if (ts.isNamespaceImport(node)) {
			this.variables.set(Helper.getText(node.name), node)
		}
	}

	/** Returns whether be top scope. */
	isTopmost(): boolean {
		return ts.isSourceFile(this.node)
	}

	/** Whether can add more statements inside. */
	canAddStatements(): boolean {
		return !Helper.isFunctionLike(this.node)
			&& !ts.isForStatement(this.node)
	}

	/** Test whether current scope is equal or an ancestor of target scope. */
	isSelfOrAncestorOf(scope: Scope): boolean {
		if (this === scope) {
			return true
		}

		if (this.parent) {
			return this.parent.isSelfOrAncestorOf(scope)
		}
		
		return false
	}
	
	/** Whether has declared a specified named local variable. */
	hasLocalVariable(name: string): boolean {
		return this.variables.has(name)
	}

	/** Whether declared local variable as const. */
	isLocalVariableConst(name: string): boolean {
		if (!this.variables.has(name)) {
			return false
		}
		
		let node = this.variables.get(name)
		if (!node) {
			return false
		}

		if (ts.isVariableDeclaration(node)) {
			return (node.parent.flags & ts.NodeFlags.Const) > 0
		}
		else if (ts.isParameter(node)) {
			return false
		}

		// Imported
		else {
			return true
		}
	}

	/** Whether can visit a a variable by it's name. */
	canVisitVariable(name: string): boolean {
		if (this.variables.has(name)) {
			return true
		}

		if (this.parent) {
			return this.parent.canVisitVariable(name)
		}
		
		return false
	}

	/** 
	 * Add a non-repetitive variable name in scope,
	 * make it have no conflict with current scope, and ancestral scopes.
	 */
	makeUniqueVariable(prefix: string): string {
		let seed = 0
		let name = prefix + seed++

		while (this.canVisitVariable(name)) {
			name = prefix + seed++
		}

		this.variables.set(name, null)

		return name
	}

	/** 
	 * Add a variable.
	 * Several variable declarations will be stacked to a variable statement.
	 */
	addVariable(name: string) {
		Scoping.addVariable(this, name)
	}

	/** Get best visiting index to add variable before it. */
	getIndexToAddVariable(): number {
		let toIndex = Visiting.getFirstChildIndex(this.visitingIndex)!

		// Insert before the first not import statements.
		if (this.isTopmost()) {
			let beforeNode = (this.node as TS.SourceFile).statements.findLast(n => !ts.isImportDeclaration(n))
			if (beforeNode) {
				toIndex = Visiting.getIndex(beforeNode)
			}
		}

		return toIndex
	}
}
