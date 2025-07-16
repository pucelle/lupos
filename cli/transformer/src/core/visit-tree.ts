import * as ts from 'typescript'
import {ListMap} from '../lupos-ts-module'
import {definePreVisitCallback} from './visitor-callbacks'
import {helper, sourceFile} from './global'


interface VisitItem {
	node: ts.Node
	index: number
}


/** 
 * Indicate node global visit index when visiting.
 * It applies an unique index to each node,
 * and use this index to do operations,
 * which can avoid confusing with raw node and made node.
 */
export namespace VisitTree {

	let stack: VisitItem[] = []
	let current: VisitItem | null = null
	let indexSeed: number = -1

	/** Parent -> child. */
	const ChildMap: ListMap<ts.Node, ts.Node> = new ListMap()

	/** Child -> parent. */
	const ParentMap: Map<ts.Node, ts.Node> = new Map()

	/** Node visit index -> Node. */
	const NodeMap: Map<number, ts.Node> = new Map()

	/** Node -> Node visit index. */
	const IndexMap: Map<ts.Node, number> = new Map()

	

	export function visitSourceFile(sourceFile: ts.SourceFile) {
		initialize()
		
		// In the first visiting initialize visit and scope tree.
		function visitor(node: ts.Node) {
			VisitTree.toNext(node)

			VisitTree.toChild()
			ts.forEachChild(node, visitor)
			VisitTree.toParent()
		}

		visitor(sourceFile)
	}
	
	
	/** Initialize before start a new source file. */
	function initialize() {
		stack = []
		current = null
		indexSeed = -1
		ChildMap.clear()
		ParentMap.clear()
		NodeMap.clear()
		IndexMap.clear()
	}

	/** To next sibling. */
	export function toNext(node: ts.Node) {
		let index = ++indexSeed
		current = {node, index}

		if (stack.length > 0) {
			let parent = stack[stack.length - 1]
			ChildMap.add(parent.node, node)
			ParentMap.set(node, parent.node)
		}

		NodeMap.set(index, node)
		IndexMap.set(node, index)
	}

	/** To first child. */
	export function toChild() {
		stack.push(current!)
		current = null
	}

	/** To parent. */
	export function toParent() {
		current = stack.pop()!
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
		return ChildMap.get(rawParent)
	}

	/** 
	 * Get parent visit index by child visit index.
	 * Equals `node.parent`.
	 */
	export function getParent(rawNode: ts.Node): ts.Node | undefined {
		return ParentMap.get(rawNode)
	}

	/** Get previous node by sibling node. */
	export function getPrevious(rawSiblingNode: ts.Node): ts.Node | undefined {
		let parent = getParent(rawSiblingNode)
		if (parent === undefined) {
			return undefined
		}

		let siblings = ChildMap.get(parent)!
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

		let siblings = ChildMap.get(parent)!
		let index = siblings.indexOf(rawSiblingNode)

		if (index < siblings.length - 1) {
			return siblings[index + 1]
		}

		return undefined
	}

	/** Test whether have raw node. */
	export function hasNode(anyNode: ts.Node): boolean {
		return IndexMap.has(anyNode)
	}

	/** Get raw node by visit index. */
	export function getNode(index: number): ts.Node {
		return NodeMap.get(index)!
	}

	/** Get visit index by a raw node. */
	export function getIndex(rawNode: ts.Node): number {
		return IndexMap.get(rawNode)!
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
		let closestFor = helper.findOutward(rawNode1, ts.isForStatement)
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

definePreVisitCallback(() => VisitTree.visitSourceFile(sourceFile))
