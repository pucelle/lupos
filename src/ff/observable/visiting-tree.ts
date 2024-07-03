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
	const ChildMap: ListMap<number, number> = new ListMap()

	export let current: VisitingItem = {
		index: -1,
	}
	
	/** Initialize before start a new source file. */
	export function initialize() {
		stack = []
		ChildMap.clear()

		current = {
			index: -1,
		}
	}

	/** To next sibling. */
	export function toNext() {
		current.index = ++indexSeed

		if (stack.length > 0) {
			let parent = stack[stack.length - 1]
			ChildMap.add(parent.index, current.index)
		}
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
}