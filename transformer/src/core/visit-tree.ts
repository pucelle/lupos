import type TS from 'typescript'
import {ListMap} from '../utils'
import {definePreVisitCallback} from './visitor-callbacks'


interface VisitItem {

	/** Visit index unique among whole source file. */
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
	let indexSeed: number = -1

	/** Parent visit index -> child visit indices. */
	const ChildMap: ListMap<number, number> = new ListMap()

	/** Child visit index -> parent visit index. */
	const ParentMap: Map<number, number> = new Map()

	/** Node visit index -> Node. */
	const NodeMap: Map<number, TS.Node> = new Map()

	/** Node -> Node visit index. */
	const IndexMap: Map<TS.Node, number> = new Map()

	let current: VisitItem = {
		index: -1,
	}
	
	
	/** Initialize before start a new source file. */
	export function initialize() {
		stack = []
		indexSeed = -1
		ChildMap.clear()
		ParentMap.clear()
		NodeMap.clear()
		IndexMap.clear()

		current = {
			index: -1,
		}
	}

	/** To next sibling. */
	export function toNext(node: TS.Node) {
		let index = ++indexSeed
		current.index = index

		if (stack.length > 0) {
			let parent = stack[stack.length - 1]
			ChildMap.add(parent.index, index)
			ParentMap.set(index, parent.index)
		}

		NodeMap.set(index, node)
		IndexMap.set(node, index)
	}

	/** To first child. */
	export function toChild() {
		stack.push(current)

		current = {
			index: -1,
		}
	}

	/** To parent. */
	export function toParent() {
		current = stack.pop()!
	}


	/** Get child visit index, by parent index and child sibling index. */
	export function getChildIndex(parentIndex: number, siblingIndex: number): number | undefined {
		return ChildMap.get(parentIndex)![siblingIndex]
	}

	/** Get first child visit index, by parent index. */
	export function getFirstChildIndex(parentIndex: number): number | undefined {
		let list = ChildMap.get(parentIndex)
		return list ? list[0] : undefined
	}

	/** Get last child visit index, by parent index. */
	export function getLastChildIndex(parentIndex: number): number | undefined {
		let list = ChildMap.get(parentIndex)
		return list ? list[list.length - 1] : undefined
	}

	/** Get count of child items. */
	export function getChildCount(parentIndex: number): number {
		return ChildMap.get(parentIndex)?.length || 0
	}

	/** Get all child visit indices. */
	export function getChildIndices(parentIndex: number): number[] | undefined {
		return ChildMap.get(parentIndex)!
	}

	/** Get all child visit indices. */
	export function getChildNodes(parentIndex: number): TS.Node[] | undefined {
		let childIndices = ChildMap.get(parentIndex)
		if (childIndices === undefined) {
			return undefined
		}

		return childIndices.map(index => NodeMap.get(index)!)
	}

	/** Get parent visit index by child visit index. */
	export function getParentIndex(childIndex: number): number | undefined {
		return ParentMap.get(childIndex)!
	}

	/** Get previous visit index by sibling visit index. */
	export function getPreviousIndex(siblingIndex: number): number | undefined {
		let parentIndex = ParentMap.get(siblingIndex)
		if (parentIndex === undefined) {
			return undefined
		}

		let siblingIndices = ChildMap.get(parentIndex)!
		let index = siblingIndices.indexOf(siblingIndex)

		if (index > 0) {
			return siblingIndices[index - 1]
		}

		return undefined
	}

	/** Get next visit index by sibling visit index. */
	export function getNextIndex(siblingIndex: number): number | undefined {
		let parentIndex = ParentMap.get(siblingIndex)
		if (parentIndex === undefined) {
			return undefined
		}

		let siblingIndices = ChildMap.get(parentIndex)!
		let index = siblingIndices.indexOf(siblingIndex)

		if (index < siblingIndices.length - 1) {
			return siblingIndices[index + 1]
		}

		return undefined
	}

	/** Test whether have raw node by visit index. */
	export function hasNode(node: TS.Node): boolean {
		return IndexMap.has(node)
	}

	/** Get raw node by visit index. */
	export function getNode(index: number): TS.Node {
		return NodeMap.get(index)!
	}

	/** Get visit index by a raw node. */
	export function getIndex(rawNode: TS.Node): number {
		return IndexMap.get(rawNode)!
	}


	/** Returns whether `index1` is ancestor of `index2`. */
	export function isAncestorOf(index1: number, index2: number): boolean {
		if (index1 >= index2) {
			return false
		}

		let index: number | undefined = getParentIndex(index2)

		// Look ancestors.
		while (index !== undefined) {
			if (index === index1) {
				return true
			}

			index = getParentIndex(index)
		}

		return false
	}

	/** Returns whether `index1` is ancestor of `index2`, or equals `index2`. */
	export function isContains(index1: number, index2: number): boolean {
		if (index1 === index2) {
			return true
		}

		return isAncestorOf(index1, index2)
	}

	/** Returns whether `index1` is preceding of `index2` in parent-first order. */
	export function isPrecedingOf(index1: number, index2: number): boolean {
		return index1 < index2
	}

	/** 
	 * Returns whether `index1` is preceding of `index2`,
	 * or equals `index2` in parent-first order.
	 */
	export function isPrecedingOfOrEqual(index1: number, index2: number): boolean {
		return index1 <= index2
	}

	/** Returns whether `index1` is preceding of `index2` in child-first order. */
	export function isPrecedingOfInChildFirstOrder(index1: number, index2: number): boolean {
		if (index1 === index2) {
			return false
		}
		else if (isAncestorOf(index1, index2)) {
			return false
		}
		else if (isAncestorOf(index2, index1)) {
			return true
		}
		else {
			return isPrecedingOf(index1, index2)
		}
	}

	/** 
	 * Returns whether `index1` is preceding of `index2`,
	 * or equals `index2` in child-first order.
	 */
	export function isPrecedingOfOrEqualInChildFirstOrder(index1: number, index2: number): boolean {
		if (index1 === index2) {
			return true
		}

		return isPrecedingOfInChildFirstOrder(index1, index2)
	}

	/** Returns whether `index1` is preceding of `index2` in parent-first order. */
	export function isFollowingOf(index1: number, index2: number): boolean {
		return index1 > index2
	}

	/** 
	 * Returns whether `index1` is following of `index2`,
	 * or equals `index2` in parent-first order.
	 */
	export function isFollowingOfOrEqual(index1: number, index2: number): boolean {
		return index1 >= index2
	}

	/** Returns whether `index1` is following of `index2` in child-first order. */
	export function isFollowingOfInChildFirstOrder(index1: number, index2: number): boolean {
		return isPrecedingOfInChildFirstOrder(index2, index1)
	}

	/** 
	 * Returns whether `index1` is following of `index2`,
	 * or equals `index2` in child-first order.
	 */
	export function isFollowingOfOrEqualInChildFirstOrder(index1: number, index2: number): boolean {
		if (index1 === index2) {
			return true
		}

		return isFollowingOfInChildFirstOrder(index1, index2)
	}

	

	/** Look outward for a visit index, and the node at where match test fn. */
	export function findOutwardMatch(fromIndex: number, untilIndex: number | undefined, test: (node: TS.Node) => boolean) : number | undefined {
		let index: number | undefined = fromIndex

		// Look outward for a node which can pass test.
		while (index !== undefined && index !== untilIndex) {
			let node = getNode(index)
			if (test(node)) {
				return index
			}

			index = getParentIndex(index)
		}

		return undefined
	}
}

definePreVisitCallback(VisitTree.initialize)