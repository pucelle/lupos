import type TS from 'typescript'
import {addToList, ListMap} from '../utils'
import {factory, sourceFile, transformContext, ts} from './global'
import {Visiting} from './visiting'
import {InterpolationContentType, Interpolator} from './interpolator'
import {Helper} from './helper'
import {definePostVisitCallback, definePreVisitCallback} from './visitor-callbacks'
import {Scope} from './scope'


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
	export function initialize() {
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


	/** Get top most scope, the scope of source file. */
	export function getTopmostScope(): Scope {
		return ScopeMap.get(Visiting.getIndex(sourceFile))!
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
	export function addVariableByScope(scope: Scope, name: string) {
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
	 * Get hash of raw node, which has a visiting index.
	 * Note hashing will transform `a?.b` -> `a.b`.
	 */
	export function hashNode(rawNode: TS.Node): HashItem {
		let index = Visiting.getIndex(rawNode)
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
	function doHashingOfNode<T extends TS.Node>(rawNode: T): HashItem {
		let referenceIndices: number[] = []

		let hashVisited = ts.visitNode(rawNode, (n: TS.Node) => {
			return hashNodeVisitor(n, referenceIndices)
		})!

		rawNode = Helper.pack.normalize(hashVisited, true) as T

		return {
			name: Helper.getText(rawNode),
			referenceIndices,
		}
	}

	function hashNodeVisitor(rawNode: TS.Node, referenceIndices: number[]): TS.Node | undefined {
		if (Helper.variable.isVariableIdentifier(rawNode)) {
			let hashed = hashVariableName(rawNode)
			addToList(referenceIndices, hashed.suffix)

			return factory.createIdentifier(hashed.name)
		}

		// `a?.b` -> `a.b`
		else if (rawNode.kind === ts.SyntaxKind.QuestionDotToken) {
			return undefined
		}

		return ts.visitEachChild(rawNode, (n: TS.Node) => hashNodeVisitor(n, referenceIndices), transformContext)
	}

	/** 
	 * Hash a node by replace variable names `a` to add a suffix.
	 * The suffix is normally a scope visiting index,
	 * then the hashing is unique across whole source file.
	 */
	function hashVariableName(rawNode: TS.Identifier): {name: string, suffix: number} {
		let name = rawNode.text
		let scope = findDeclaredScope(rawNode) || findClosestScopeOfNode(rawNode)
		let suffix = scope.visitingIndex

		return {
			name: name + '_' + suffix,
			suffix,
		}
	}


	/** 
	 * Try get raw node by it's variable name.
	 * `fromRawNode` specifies where to query the variable from.
	 */
	export function getDeclarationByName(name: string, fromRawNode: TS.Node): TS.Node | undefined {
		let scope = findClosestScopeOfNode(fromRawNode)
		if (!scope) {
			return undefined
		}

		return scope.getDeclarationByName(name)
	}
	
	
	/** Check at which scope the specified named variable declared. */
	export function findDeclaredScope(rawNode: TS.Identifier, fromScope = findClosestScopeOfNode(rawNode)): Scope | null {
		if (fromScope.hasLocalVariable(rawNode.text)) {
			return fromScope
		}
		else if (fromScope.parent) {
			return findDeclaredScope(rawNode, fromScope.parent!)
		}
		else {
			return null
		}
	}

	/** Returns whether declared variable at top (source file) scope. */
	function isDeclaredInTopScope(rawNode: TS.Identifier): boolean {
		let declaredIn = findDeclaredScope(rawNode)
		return declaredIn ? declaredIn.isTopmost() : false
	}

	/** Returns whether a node is declared within target node. */
	function isDeclaredWithinNodeRange(rawNode: TS.Identifier, targetNode: TS.Node): boolean {
		let declaredIn = findDeclaredScope(rawNode)
		if (!declaredIn) {
			return false
		}

		let n: TS.Node = declaredIn.node

		do {
			if (n === targetNode) {
				return true
			}

			n = n.parent
		} while (n)

		return false
	}

	/** Returns whether a variable node was declared as const. */
	function isDeclaredAsConstLike(rawNode: TS.Identifier): boolean {
		let scope = findDeclaredScope(rawNode)
		return scope ? scope.isLocalVariableConstLike(rawNode.text) : false
	}


	/** Test whether expression represented value is mutable. */
	export function testMutable(rawNode: TS.Expression): MutableMask {
		return testMutableVisitor(rawNode, false)
	}

	function testMutableVisitor(rawNode: TS.Node, inFunction: boolean): MutableMask {
		let mutable: MutableMask = 0

		// Inside of a function
		inFunction ||= Helper.isFunctionLike(rawNode)

		// Variable
		if (Helper.variable.isVariableIdentifier(rawNode)) {
	
			// If in child scope, become mutable only when uses a local variable.
			// Which means: the variable should not been declared in top scope.
			if (inFunction) {
				let declaredInTopmostScope = isDeclaredInTopScope(rawNode)

				// Should apply mutable and not applied.
				if (!declaredInTopmostScope) {
					mutable |= MutableMask.Mutable
				}
			}

			// Otherwise become mutable except defining as non-const.
			else {
				let constDeclared = isDeclaredAsConstLike(rawNode)
				if (!constDeclared) {
					mutable |= MutableMask.Mutable
					mutable |= MutableMask.CantTurnStatic
				}
			}
		}

		// Readonly, or method.
		// If in a child scope, all property visiting is not mutable.
		else if (Helper.access.isAccess(rawNode) && !inFunction) {

			// Use method, but not call it.
			let useNotCalledMethod = Helper.symbol.resolveMethod(rawNode) && !ts.isCallExpression(rawNode.parent)

			// Use readonly property.
			let useReadonlyProperty = Helper.symbol.resolveProperty(rawNode) && Helper.types.isReadonly(rawNode)

			if (!(useNotCalledMethod || useReadonlyProperty)) {
				mutable |= MutableMask.Mutable

				if (!inFunction) {
					mutable |= MutableMask.CantTurnStatic
				}
			}
		}

		ts.visitEachChild(rawNode, (node: TS.Node) => {
			mutable |= testMutableVisitor(node, inFunction)
			return node
		}, transformContext)

		return mutable
	}


	/** Replace an identifier or this keyword. */
	type NodeReplacer = (node: TS.Identifier | TS.ThisExpression) => TS.Expression

	/** 
	 * Transfer a raw or replaced node to top scope,
	 * output a new node, and a referenced variable list.
	 * `replacer` can help to modify node when doing transfer,
	 * it replace local variables and `this` to some parameters.
	 */
	export function transferToTopmostScope<T extends TS.Node>(
		node: T,
		rawNode: TS.Node,
		replacer: NodeReplacer
	): T {
		return transferToTopmostScopeVisitor(node, rawNode, true, replacer) as T
	}

	function transferToTopmostScopeVisitor(
		node: TS.Node,
		rawTopNode: TS.Node,
		canReplaceThis: boolean,
		replacer: NodeReplacer
	): TS.Node {
		
		// Raw variable
		if (Visiting.hasNode(node) && Helper.variable.isVariableIdentifier(node)) {

			// If declared in top scope, can still visit after transferred,
			// no need to replace it.

			// If declared in local scope within transferring content,
			// will be transferred with template together.

			let isDeclaredWithinTransferring = isDeclaredWithinNodeRange(node, rawTopNode)
			let shouldNotReplace = isDeclaredInTopScope(node) || isDeclaredWithinTransferring
			if (!shouldNotReplace) {
				return replacer(node)
			}
		}

		// this
		else if (canReplaceThis && node.kind === ts.SyntaxKind.ThisKeyword) {
			return replacer(node as TS.ThisExpression)
		}

		// If enters non-arrow function declaration, cause can't replace `this`.
		canReplaceThis &&= !(Helper.isFunctionLike(node) && !ts.isArrowFunction(node))

		return ts.visitEachChild(node, (node: TS.Node) => {
			return transferToTopmostScopeVisitor(node, rawTopNode, canReplaceThis, replacer)
		}, transformContext)
	}
}


definePreVisitCallback(Scoping.initialize)
definePostVisitCallback(Scoping.applyInterpolation)
