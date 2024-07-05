import type TS from 'typescript'
import {ListMap} from '../../utils'


interface VisitingItem {

	/** Visiting index across whole source file. */
	index: number
}


/** Indicate node depth and the index in sibling nodes when visiting. */
export namespace VisitingTree {

	let stack: VisitingItem[] = []
	let indexSeed: number = -1

	/** Parent visiting index -> child visiting indices. */
	const ChildMap: ListMap<number, number> = new ListMap()

	/** Child visiting index -> parent visiting index. */
	const ParentMap: Map<number, number> = new Map()

	/** Node visiting index -> Node. */
	const NodeMap: Map<number, TS.Node> = new Map()

	/** Node visiting index -> Node sibling index. */
	const SiblingIndexMap: Map<number, number> = new Map()

	export let current: VisitingItem = {
		index: -1,
	}
	
	/** Initialize before start a new source file. */
	export function initialize() {
		stack = []
		ChildMap.clear()
		ParentMap.clear()
		NodeMap.clear()
		SiblingIndexMap.clear()

		current = {
			index: -1,
		}
	}

	/** To next sibling. */
	export function toNext(node: TS.Node) {
		current.index = ++indexSeed

		if (stack.length > 0) {
			let parent = stack[stack.length - 1]
			ChildMap.add(parent.index, current.index)
			ParentMap.set(current.index, parent.index)
			SiblingIndexMap.set(current.index, ChildMap.get(parent.index)!.length - 1)
		}

		NodeMap.set(current.index, node)
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
	export function getChildIndexBySiblingIndex(parentIndex: number, siblingIndex: number): number {
		return ChildMap.get(parentIndex)![siblingIndex]
	}

	/** Get last child visiting index, by parent index. */
	export function getLastChildIndex(parentIndex: number): number {
		let list = ChildMap.get(parentIndex)!
		return list[list.length - 1]
	}

	/** Get count of child items. */
	export function getChildCount(parentIndex: number): number {
		return ChildMap.get(parentIndex)!.length
	}

	/** Get sibling index among it's sibling nodes by visiting index. */
	export function getSiblingIndex(index: number): number {
		return SiblingIndexMap.get(index)!
	}

	/** Get parent visiting index by child visiting index. */
	export function getParentIndex(childIndex: number): number {
		return ParentMap.get(childIndex)!
	}

	/** Get node bu visiting index. */
	export function getNode(index: number): TS.Node {
		return NodeMap.get(index)!
	}
}