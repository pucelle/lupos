import type TS from 'typescript'
import {ListMap} from '../utils'
import {definePreVisitCallback} from './visitor-callbacks'


interface VisitingItem {

	/** Visiting index unique among whole source file. */
	index: number
}


/** 
 * Indicate node global visiting index when visiting.
 * It applies an unique index to each node,
 * and use this index to do operations,
 * which can avoid confusing with raw node and made node.
 */
export namespace Visiting {

	let stack: VisitingItem[] = []
	let indexSeed: number = -1

	/** Parent visiting index -> child visiting indices. */
	const ChildMap: ListMap<number, number> = new ListMap()

	/** Child visiting index -> parent visiting index. */
	const ParentMap: Map<number, number> = new Map()

	/** Node visiting index -> Node. */
	const NodeMap: Map<number, TS.Node> = new Map()

	/** Node -> Node visiting index. */
	const IndexMap: Map<TS.Node, number> = new Map()

	let current: VisitingItem = {
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


	/** Get child visiting index, by parent index and child sibling index. */
	export function getChildIndex(parentIndex: number, siblingIndex: number): number | undefined {
		return ChildMap.get(parentIndex)![siblingIndex]
	}

	/** Get first child visiting index, by parent index. */
	export function getFirstChildIndex(parentIndex: number): number | undefined {
		let list = ChildMap.get(parentIndex)
		return list ? list[0] : undefined
	}

	/** Get last child visiting index, by parent index. */
	export function getLastChildIndex(parentIndex: number): number | undefined {
		let list = ChildMap.get(parentIndex)
		return list ? list[list.length - 1] : undefined
	}

	/** Get count of child items. */
	export function getChildCount(parentIndex: number): number {
		return ChildMap.get(parentIndex)?.length || 0
	}

	/** Get all child visiting indices. */
	export function getChildIndices(parentIndex: number): number[] | undefined {
		return ChildMap.get(parentIndex)!
	}

	/** Get all child visiting indices. */
	export function getChildNodes(parentIndex: number): TS.Node[] | undefined {
		let childIndices = ChildMap.get(parentIndex)
		if (childIndices === undefined) {
			return undefined
		}

		return childIndices.map(index => NodeMap.get(index)!)
	}

	/** Get parent visiting index by child visiting index. */
	export function getParentIndex(childIndex: number): number | undefined {
		return ParentMap.get(childIndex)!
	}

	/** Test whether have raw node by visiting index. */
	export function hasNode(node: TS.Node): boolean {
		return IndexMap.has(node)
	}

	/** Get raw node by visiting index. */
	export function getNode(index: number): TS.Node {
		return NodeMap.get(index)!
	}

	/** Get visiting index by a raw node. */
	export function getIndex(rawNode: TS.Node): number {
		return IndexMap.get(rawNode)!
	}
	

	/** Look outward for a visiting index, and the node at where match test fn. */
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

	/** Look outward for a visiting index, which is the sibling of `siblingIndex`. */
	export function findOutwardSiblingWith(fromIndex: number, siblingIndex: number) : number | undefined {
		let parentIndex = getParentIndex(siblingIndex)
		let index: number | undefined = fromIndex

		// Look outward for a variable declaration.
		while (index !== undefined) {
			let pi = getParentIndex(index)

			if (pi === parentIndex) {
				return index
			}

			index = pi
		}

		return undefined
	}
}

definePreVisitCallback(Visiting.initialize)