import ts from 'typescript'
import {Hashing, HashKey} from '../hashing'
import {VisitTree} from '../visit-tree'


/** Include mask and referenced hashes. */
export interface MutableState {
	mask: MutableMask | 0
	hashesInsideFunction: HashKey[]
	hashesOutsideFunction: HashKey[]
}

/** Whether a expression be mutable, and whether it can turn. */
export enum MutableMask {

	/** If referenced variable outside of function is assignable, and need to update for multiple times. */
	HasLocalMutable = 1,

	/** Whether have any local variable assignment. */
	HasLocalAssignment = 2,
}

/** For testing or applying transferring. */
export interface MutableConfig {

	/** 
	 * Whether work as a lazy callback, will not call immediately.
	 * Default value is false.
	 */
	asLazyCallback?: boolean

	/** 
	 * Whether already within function body.
	 * Default value is false.
	 */
	withinFunction?: boolean

	/** Skip transferring by these hashes. */
	skipHashes?: HashKey[]
}


/** Merge child node mutable state. */
export function mergeSubMutableState(state: MutableState, sub: MutableState) {
	state.mask |= sub.mask

	if (sub.hashesInsideFunction.length > 0) {
		state.hashesInsideFunction.push(...sub.hashesInsideFunction)
	}

	if (sub.hashesOutsideFunction.length > 0) {
		state.hashesOutsideFunction.push(...sub.hashesOutsideFunction)
	}
}


/** Test whether expression represented value is mutable. */
export function testMutable(state: MutableState, config: MutableConfig = {}): boolean {
	if (config.withinFunction) {
		return false
	}
	
	return (state.mask & MutableMask.HasLocalMutable) > 0
}


/** Test whether can replace node when transferring. */
export function canTransferNode(node: ts.Node, config: MutableConfig) {
	if (!config.skipHashes) {
		return true
	}

	if (!VisitTree.hasNode(node)) {
		return true
	}

	return !config.skipHashes.includes(Hashing.hashNode(node).key)
}


/** Test whether can re-declare as static content to avoid updating each time. */
export function testTransferable(state: MutableState, config: MutableConfig = {}): boolean {

	// Always transferable.
	if (config.withinFunction && config.asLazyCallback) {
		return true
	}

	let mutable = (state.mask & MutableMask.HasLocalMutable) > 0

	// If mutable, always can't transfer.
	if (mutable) {
		return false
	}

	// Can transfer as a callback, and local variable reference will be passed by `$latest_x`.
	// But if has local assignment, should replace it to a handler.
	// If have local reference, should replace it to a handler.
	if (config.asLazyCallback) {
		let hasLocalAssignment = (state.mask & MutableMask.HasLocalAssignment) > 0
		if (hasLocalAssignment) {
			return false
		}

		// Will visit the reference immediately, out of callback.
		let outsideHashes = state.hashesOutsideFunction

		if (config.withinFunction) {
			outsideHashes = []
		}

		if (config.skipHashes && outsideHashes.length > 0) {
			outsideHashes = outsideHashes.filter(h => !config.skipHashes!.includes(h))
		}

		let hasImmediateReference = outsideHashes.length > 0
		if (hasImmediateReference) {
			return false
		}

		return true
	}

	// If have local reference, either inside or outside, can't transfer.
	let hasLocalReference = config.skipHashes
		? [...state.hashesInsideFunction, ...state.hashesOutsideFunction].some(h => !config.skipHashes!.includes(h))
		: state.hashesInsideFunction.length > 0 || state.hashesOutsideFunction.length > 0

	if (hasLocalReference) {
		return false
	}

	return true
}
