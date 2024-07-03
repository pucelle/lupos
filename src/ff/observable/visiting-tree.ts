import {ListMap} from '../../utils'


interface VisitingItem {

	/** Visiting index across whole source file. */
	index: number
}


/** Indicate node depth and the index in sibling nodes when visiting. */
export namespace VisitingTree {

	let stack: VisitingItem[] = []
	let indexSeed: number = -1

	/** Parent visiting id -> child visiting ids. */
	const childMap: ListMap<number, number> = new ListMap()

	export let current: VisitingItem = {
		index: -1,
	}
	
	/** Initialize before start a new source file. */
	export function initialize() {
		stack = []
		childMap.clear()

		current = {
			index: -1,
		}
	}

	/** To next sibling. */
	export function toNext() {
		current.index = ++indexSeed

		if (stack.length > 0) {
			let parent = stack[stack.length - 1]
			childMap.add(parent.index, current.index)
		}
	}

	/** To first child. */
	export function toChild() {
		let parent = current
		stack.push(current)

		current = {
			index: ++indexSeed,
		}

		childMap.add(parent.index, current.index)
	}

	/** To parent. */
	export function toParent() {
		current = stack.pop()!
	}

	/** Get child visiting index, by parent index and child sibling index. */
	export function getChildIndexBySiblingIndex(parentIndex: number, siblingIndex: number): number {
		return childMap.get(parentIndex)![siblingIndex]
	}

	/** Get last child visiting index, by parent index. */
	export function getLastChildIndex(parentIndex: number): number {
		let list = childMap.get(parentIndex)!
		return list[list.length - 1]
	}

	/** Get count of child items. */
	export function getChildCount(parentIndex: number): number {
		return childMap.get(parentIndex)!.length
	}
}