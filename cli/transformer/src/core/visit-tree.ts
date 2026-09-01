import ts from 'typescript'
import {ListMap} from '../lupos-ts-module'
import {definePreVisitCallback} from './visitor-callbacks'
import {transformSession, transformContext} from './global'
import {createTransformSessionStateKey} from './transform-session'


interface VisitItem {
	node: ts.Node
	index: number
}

interface VisitTreeState {
	stack: VisitItem[]
	current: VisitItem | null
	indexSeed: number
	childMap: ListMap<ts.Node, ts.Node>
	parentMap: Map<ts.Node, ts.Node>
	nodeMap: Map<number, ts.Node>
	indexMap: Map<ts.Node, number>
}


/** 
 * Indicate node global visit index when visiting.
 * It applies an unique index to each node,
 * and use this index to do operations,
 * which can avoid confusing with raw node and made node.
 */
export namespace VisitTree {

	const StateKey = createTransformSessionStateKey<VisitTreeState>('VisitTree')

	function getState(): VisitTreeState {
		return transformSession.getState(StateKey, () => ({
			stack: [],
			current: null,
			indexSeed: -1,
			childMap: new ListMap(),
			parentMap: new Map(),
			nodeMap: new Map(),
			indexMap: new Map(),
		}))
	}

	export function visitSourceFile(sourceFile: ts.SourceFile) {
		// In the first visiting initialize visit and scope tree.
		function visitor(node: ts.Node) {
			VisitTree.toChild(node)
			ts.forEachChild(node, visitor)
			VisitTree.toParent()
		}

		visitor(sourceFile)
	}
	
	
	/** Before entering child nodes. */
	export function toChild(node: ts.Node) {
		let state = getState()
		let index = ++state.indexSeed
		let parent = state.current

		state.current = {node, index}

		if (parent) {
			state.stack.push(parent)
			state.childMap.add(parent.node, node)
			state.parentMap.set(node, parent.node)
		}

		state.nodeMap.set(index, node)
		state.indexMap.set(node, index)
	}

	/** Exit self and enter parent node. */
	export function toParent() {
		let state = getState()
		state.current = state.stack.pop()!
	}


	/** Get child, by parent and child sibling index. */
	export function getChild(rawParent: ts.Node, siblingIndex: number): ts.Node | undefined {
		let childNodes = getChildNodes(rawParent)
		return childNodes ? childNodes[siblingIndex] : undefined
	}

	/** Get first child by parent. */
	export function getFirstChild(rawParent: ts.Node): ts.Node | undefined {
		let childNodes = getChildNodes(rawParent)
		return childNodes ? childNodes[0] : undefined
	}

	/** Get last child by parent. */
	export function getLastChild(rawParent: ts.Node): ts.Node | undefined {
		let childNodes = getChildNodes(rawParent)
		return childNodes ? childNodes[childNodes.length - 1] : undefined
	}

	/** Get count of child items. */
	export function getChildCount(rawParent: ts.Node): number {
		let childNodes = getChildNodes(rawParent)
		return childNodes ? childNodes.length : 0
	}

	/** Get all child nodes. */
	export function getChildNodes(rawParent: ts.Node): ts.Node[] | undefined {
		return getState().childMap.get(rawParent)
	}

	/** 
	 * Get parent visit index by child visit index.
	 * Equals `node.parent`.
	 */
	export function getParent(rawNode: ts.Node): ts.Node | undefined {
		return getState().parentMap.get(rawNode)
	}

	/** Get previous node by sibling node. */
	export function getPrevious(rawSiblingNode: ts.Node): ts.Node | undefined {
		let parent = getParent(rawSiblingNode)
		if (parent === undefined) {
			return undefined
		}

		let siblings = getState().childMap.get(parent)!
		let index = siblings.indexOf(rawSiblingNode)

		if (index > 0) {
			return siblings[index - 1]
		}

		return undefined
	}

	/** Get next node by sibling node. */
	export function getNext(rawSiblingNode: ts.Node): ts.Node | undefined {
		let parent = getParent(rawSiblingNode)
		if (parent === undefined) {
			return undefined
		}

		let siblings = getState().childMap.get(parent)!
		let index = siblings.indexOf(rawSiblingNode)

		if (index < siblings.length - 1) {
			return siblings[index + 1]
		}

		return undefined
	}

	/** Test whether have raw node. */
	export function hasNode(anyNode: ts.Node): boolean {
		return getState().indexMap.has(anyNode)
	}

	/** Get raw node by visit index. */
	export function getNode(index: number): ts.Node {
		return getState().nodeMap.get(index)!
	}

	/** Get visit index by a raw node. */
	export function getIndex(rawNode: ts.Node): number {
		return getState().indexMap.get(rawNode)!
	}


	/** Returns whether `node1` is ancestor of `node2`. */
	export function isAncestorOf(rawNode1: ts.Node, rawNode2: ts.Node): boolean {
		let index1 = getIndex(rawNode1)
		let index2 = getIndex(rawNode2)

		if (index1 >= index2) {
			return false
		}

		let parent = getParent(rawNode2)

		// Look ancestors.
		while (parent) {
			if (parent === rawNode1) {
				return true
			}

			parent = getParent(parent)
		}

		return false
	}

	/** Returns whether `node1` is ancestor of `node2`, or equals `node2`. */
	export function isContains(rawNode1: ts.Node, rawNode2: ts.Node): boolean {
		if (rawNode1 === rawNode2) {
			return true
		}

		return isAncestorOf(rawNode1, rawNode2)
	}

	/** Returns whether `node1` is preceding of `node2` in parent-first order. */
	export function isPrecedingOf(rawNode1: ts.Node, rawNode2: ts.Node): boolean {
		let index1 = getIndex(rawNode1)
		let index2 = getIndex(rawNode2)

		return index1 < index2
	}

	/** 
	 * Returns whether `node1` is preceding of `node2`,
	 * or equals `node2` in parent-first order.
	 */
	export function isPrecedingOfOrEqual(rawNode1: ts.Node, rawNode2: ts.Node): boolean {
		let index1 = getIndex(rawNode1)
		let index2 = getIndex(rawNode2)

		return index1 <= index2
	}

	/** Returns whether `node1` is preceding of `node2` in child-first order. */
	export function isPrecedingOfInChildFirstOrder(rawNode1: ts.Node, rawNode2: ts.Node): boolean {
		if (rawNode1 === rawNode2) {
			return false
		}
		else if (isAncestorOf(rawNode1, rawNode2)) {
			return false
		}
		else if (isAncestorOf(rawNode2, rawNode1)) {
			return true
		}
		else {
			return isPrecedingOf(rawNode1, rawNode2)
		}
	}

	/** 
	 * Returns whether `node1` is preceding of `node2`,
	 * or equals `node2` in child-first order.
	 */
	export function isPrecedingOfOrEqualInChildFirstOrder(rawNode1: ts.Node, rawNode2: ts.Node): boolean {
		if (rawNode1 === rawNode2) {
			return true
		}

		return isPrecedingOfInChildFirstOrder(rawNode1, rawNode2)
	}

	/** 
	 * Returns whether `node1` is preceding of `node2` in run order.
	 * Normally it equals `isPrecedingOfInChildFirstOrder`, except:
	 * `for (;;i++){}`, `i++` will be moved to after `{}`.
	 */
	export function isPrecedingOfInRunOrder(rawNode1: ts.Node, rawNode2: ts.Node): boolean {
		if (rawNode1 === rawNode2) {
			return false
		}
		else if (isAncestorOf(rawNode1, rawNode2)) {
			return false
		}
		else if (isAncestorOf(rawNode2, rawNode1)) {
			return true
		}

		// `for (;;i++){}`, increment `i++` will be moved to after statement `{}`.
		let closestFor = transformContext.helper.findOutward(rawNode1, ts.isForStatement)
		if (closestFor
			&& closestFor.incrementor
			&& isAncestorOf(closestFor, rawNode1)
			&& isAncestorOf(closestFor, rawNode2)
		) {
			if (isContains(closestFor.incrementor, rawNode1)
				&& isContains(closestFor.statement, rawNode2)
			) {
				return false
			}
			else if (isContains(closestFor.incrementor, rawNode2)
				&& isContains(closestFor.statement, rawNode1)
			) {
				return true
			}
		}

		return isPrecedingOf(rawNode1, rawNode2)
	}

	/** 
	 * Returns whether `node1` is preceding of `node2`,
	 * or equals `node2` in child-first order.
	 */
	export function isPrecedingOfOrEqualInRunOrder(rawNode1: ts.Node, rawNode2: ts.Node): boolean {
		if (rawNode1 === rawNode2) {
			return true
		}

		return isPrecedingOfInRunOrder(rawNode1, rawNode2)
	}
}

definePreVisitCallback(() => VisitTree.visitSourceFile(transformSession.sourceFile))
