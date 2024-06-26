import type ts from 'typescript'
import {CanObserveNode} from './checker'


interface ReferenceItem {
	node: ts.Node
	key: string
}


/** 
 * Cache all the referenced nodes of an accessing node.
 * and the back reference from a referenced node to which reference it.
 */
export namespace ReferenceTree {

	let stack: ReferenceItem[] = []


	export let current: ReferenceItem = {
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