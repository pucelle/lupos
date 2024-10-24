import type TS from 'typescript'
import {Helper} from '../../base'
import {ObservedChecker} from './observed-checker'
import {AccessGrouper} from './access-grouper'


export enum ForceTrackType {
	Self,
	Members,
}


/** 
 * Ignore some tracking additional,
 * or build a single tracking node.
 */
export namespace TrackingPatch {

	const Ignored: Set<number> = new Set()
	const ForceTracked: Map<number, ForceTrackType> = new Map()


	/** Initialize after each time source file updated. */
	export function init() {
		Ignored.clear()
		ForceTracked.clear()
	}

	/** Ignore outputting tracking node by it's visit index. */
	export function ignore(index: number) {
		Ignored.add(index)
	}

	/** Check whether ignored outputting specified visit index. */
	export function isIndexIgnored(index: number): boolean {
		return Ignored.has(index)
	}

	/** 
	 * Force tracking node at specified visit index.
	 * If tracking type is `Members`, for array type, will track members.
	 */
	export function forceRecheck(index: number, type: ForceTrackType) {
		ForceTracked.set(index, type)
	}

	/** Check whether force tracking specified visit index. */
	export function isIndexForceTracked(index: number): boolean {
		return ForceTracked.has(index)
	}

	/** Check whether force tracking members of specified visit index. */
	export function getIndexForceTrackType(index: number): ForceTrackType | undefined {
		return ForceTracked.get(index)
	}

	/** Output isolated tracking expressions. */
	export function outputIsolatedTracking(rawNode: TS.Expression, type: 'get' | 'set'): TS.Expression[] {
		if (!Helper.access.isAccess(rawNode)) {
			return []
		}

		if (!ObservedChecker.isAccessObserved(rawNode)) {
			return []
		}

		AccessGrouper.addImport(type)
		return AccessGrouper.makeExpressions([rawNode], type)
	}
}