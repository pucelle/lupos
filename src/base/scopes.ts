import type TS from 'typescript'
import {Helper, transformContext, ts, Visiting, factory} from '../base'
import {addToList} from '../utils'


interface HashItem {
	name: string

	/** The context visiting indices each internal variable reference. */
	referenceIndices: number[]
}


export namespace Scopes {

	let stack: Scope[] = []
	export let current: Scope | null = null

	/** Visiting index -> scope. */
	const scopeMap: Map<number, Scope> = new Map()

	/** Visiting index -> node hash result. */
	const hashMap: Map<number, HashItem> = new Map()


	/** Initialize before visiting a new source file. */
	export function init() {
		stack = []
		current = null
		hashMap.clear()
	}


	/** To next sibling. */
	export function toNext(node: TS.Node, index: number) {
		if (ts.isSourceFile(node)) {
			current = new Scope(node, index, null)
			scopeMap.set(index, current)
		}
		else if (ts.isFunctionDeclaration(node)) {
			current = new Scope(node, index, stack[stack.length - 1])
			scopeMap.set(index, current)
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
	

	/** Get closest scope contains node with specified visiting index. */
	export function getClosestScopeOfIndex(index: number): Scope {
		let scope = scopeMap.get(index)

		while (!scope) {
			index = Visiting.getParentIndex(index)!
			scope = scopeMap.get(index)
		}

		return scope
	}


	/** Get closest scope contains node. */
	export function getClosestScopeOfNode(node: TS.Node): Scope {
		return getClosestScopeOfIndex(Visiting.getIndex(node))
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
		if (hashMap.has(index)) {
			return hashMap.get(index)!
		}

		let hashed = doHashOfNode(Visiting.getNode(index))
		hashMap.set(index, hashed)

		return hashed
	}

	/** 
	 * Hash a node, normalize and add a unique suffix to all variable nodes.
	 * `maximumReferencedIndex` means: if you want to move this node,
	 * it can't be moved before node with visiting index >= this value. 
	 */
	function doHashOfNode<T extends TS.Node>(node: T): HashItem {
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
		let scope = getClosestScopeOfIndex(Visiting.getIndex(node))
		let suffix = scope.visitingIndex

		return {
			name: name + '_' + suffix,
			suffix,
		}
	}
	
	
	/** Check at which scope the specified named variable declared. */
	function getDeclaredScope(node: TS.Identifier, fromScope = getClosestScopeOfNode(node)): Scope | null {
		if (fromScope.hasLocalVariable(node.text)) {
			return fromScope
		}
		else if (fromScope.parent) {
			return getDeclaredScope(node, fromScope.parent!)
		}
		else {
			return null
		}
	}


	/** Returns whether declared variable at top (source file) scope. */
	function isDeclaredInTopScope(node: TS.Identifier): boolean {
		let scope = getDeclaredScope(node)
		return scope ? ts.isSourceFile(scope.node) : false
	}


	/** Returns whether a variable node was declared as const. */
	function isDeclaredAsConst(node: TS.Identifier): boolean {
		let scope = getDeclaredScope(node)
		return scope ? scope.isLocalVariableConst(node.text) : false
	}


	/** Test whether expression represented value is mutable. */
	export function isMutable(node: TS.Expression): boolean {
		return visitNodeTestMutable(node, false)
	}

	function visitNodeTestMutable(node: TS.Node, inChildScope: boolean): boolean {
		let mutable = false

		inChildScope ||= ts.isFunctionDeclaration(node)

		// Variable
		if (Helper.variable.isVariableIdentifier(node)) {

			// If in child scope, become mutable only when uses a local variable.
			// Which means: the variable should not been declared in top scope.
			if (inChildScope) {
				let declaredInTopScope = isDeclaredInTopScope(node)
				mutable ||= !declaredInTopScope
			}

			// Otherwise become mutable except not const defined.
			else {
				let constDeclared = isDeclaredAsConst(node)
				mutable ||= !constDeclared
			}
		}

		// Readonly, or method.
		// If in a child scope, all property visiting is not mutable.
		else if (Helper.access.isAccess(node) && !inChildScope) {

			// Use method, but not call it.
			let useNotCalledMethod = Helper.symbol.resolveMethod(node) && !ts.isCallExpression(node.parent)

			// Use readonly property.
			let useReadonlyProperty = Helper.symbol.resolveProperty(node) && Helper.types.isReadonly(node)

			mutable ||= !(useNotCalledMethod || useReadonlyProperty)
		}

		ts.visitEachChild(node, (node: TS.Node) => {
			mutable ||= visitNodeTestMutable(node, inChildScope)
			return node
		}, transformContext)

		return mutable
	}


	/** Replace an identifier or this keyword. */
	type NodeReplacer = (node: TS.Identifier | TS.ThisExpression) => TS.Identifier | TS.ThisExpression

	/** 
	 * Transfer a function to top scope, output new function, and a reference variable list.
	 * `replacer` can help to modify node when doing transfer.
	 */
	export function transferToTop(node: TS.FunctionLikeDeclaration,	replacer: NodeReplacer): TS.FunctionLikeDeclaration {
		return visitNodeTransferToTop(node, replacer) as TS.FunctionLikeDeclaration
	}

	function visitNodeTransferToTop(node: TS.Node, replacer: NodeReplacer): TS.Node {

		// Variable
		if (Helper.variable.isVariableIdentifier(node)) {
			if (!isDeclaredInTopScope(node)) {
				return replacer(node)
			}
		}

		// this
		else if (node.kind === ts.SyntaxKind.ThisKeyword) {
			return replacer(node as TS.ThisExpression)
		}

		return ts.visitEachChild(node, (node: TS.Node) => {
			return visitNodeTransferToTop(node, replacer)
		}, transformContext)
	}
}


/** Mark all variables with a context. */
export class Scope {

	readonly node: TS.FunctionLikeDeclaration | TS.SourceFile
	readonly parent: Scope | null
	readonly visitingIndex: number

	/** All variables declared here. */
	private variables: Map<string, TS.Node | null> = new Map()

	constructor(node: TS.FunctionLikeDeclaration | TS.SourceFile, index: number, parent: Scope | null) {
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
			return true
		}
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
}
