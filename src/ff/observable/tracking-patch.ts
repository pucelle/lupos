import type TS from 'typescript'
import {Helper} from '../../base'
import {ObservedChecker} from './observed-checker'
import {AccessGrouper} from './access-grouper'


/** 
 * Ignore some tracking additional,
 * or build a single tracking node.
 */
export namespace TrackingPatch {

	const Ignored: Set<number> = new Set()


	/** Initialize after each time source file updated. */
	export function init() {
		Ignored.clear()
	}

	/** Ignore tracking node by it's visiting index. */
	export function ignore(index: number) {
		Ignored.add(index)
	}

	/** Check whether ignored specified visiting index. */
	export function ignoredIndex(index: number): boolean {
		return Ignored.has(index)
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