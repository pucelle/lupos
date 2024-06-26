interface VisitingItem {
	depth: number
	index: number
}


/** Cache visiting tree depth and the index in sibling nodes. */
export namespace VisitingTree {

	let stack: VisitingItem[] = []

	export let current: VisitingItem = {
		depth: 0,
		index: -1,
	}
	
	/** Initialize before start a new source file. */
	export function initialize() {
		stack = []
		current = {depth: 0, index: -1}
	}

	/** To next sibling. */
	export function toNext() {
		current.index++
	}

	/** To first child. */
	export function toChild() {
		stack.push(current)

		current = {
			depth: current.depth + 1,
			index: 0,
		}
	}

	/** To parent. */
	export function toParent() {
		current = stack.pop()!
	}

	/** Get sibling index of specified depth of ancestor. */
	export function getIndexOfDepth(depth: number) {
		if (depth === current.depth) {
			return current
		}
		else {
			return stack[stack.length - (current.depth + depth)]
		}
	}
}