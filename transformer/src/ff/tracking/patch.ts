import * as ts from 'typescript'
import {ObservedChecker} from './observed-checker'
import {AccessGrouper} from './access-grouper'
import {TrackingRanges} from './ranges'
import {helper} from '../../core'


export enum ForceTrackType {
	Self,
	Elements,
}


/** 
 * Ignore some tracking additional,
 * or build a single tracking node.
 */
export namespace TrackingPatch {

	const Ignored: Set<ts.Node> = new Set()
	const ForceTracked: Map<ts.Node, ForceTrackType> = new Map()


	/** Initialize after each time source file updated. */
	export function init() {
		Ignored.clear()
		ForceTracked.clear()
	}

	/** 
	 * Ignore outputting tracking node by it's visit index.
	 * Note it ignores outputting, not prevent observe checking.
	 */
	export function ignore(rawNode: ts.Node) {
		Ignored.add(rawNode)
	}

	/** Check whether ignored outputting specified visit index. */
	export function isIgnored(rawNode: ts.Node): boolean {
		return Ignored.has(rawNode)
	}

	/** 
	 * Force re-check node at specified visit index.
	 * 
	 * If tracking type is `Elements`, for array type, will track elements,
	 * and it would apply additional elements get tracking.
	 */
	export function forceTrack(rawNode: ts.Node, type: ForceTrackType) {
		ForceTracked.set(rawNode, type)
	}

	/** 
	 * Check whether force tracking specified visit index.
	 * 
	 * `parental` specifies whether are visiting parent node of original
	 * to determine whether elements should be observed.
	 */
	export function isForceTracked(rawNode: ts.Node, parental: boolean = false): boolean {
		let type = ForceTracked.get(rawNode)
		if (type === undefined) {
			return false
		}

		if (type === ForceTrackType.Elements && parental) {
			return true
		}
		else if (type === ForceTrackType.Self && !parental) {
			return true
		}

		return false
	}

	/** Get force tracking type of specified node. */
	export function getForceTrackType(rawNode: ts.Node): ForceTrackType | undefined {
		return ForceTracked.get(rawNode)
	}

	/** Output isolated tracking expressions. */
	export function outputIsolatedTracking(rawNode: ts.Expression, type: 'get' | 'set'): ts.Expression[] {
		if (!helper.access.isAccess(rawNode)) {
			return []
		}

		if (!ObservedChecker.isObserved(rawNode)) {
			return []
		}

		AccessGrouper.addImport(type)
		return AccessGrouper.makeExpressions([rawNode], type)
	}

	/** Output custom range tracking expressions by. */
	export function outputCustomRangeTracking(rangeId: number): ts.Expression[] {
		let scope = TrackingRanges.getScopeByRangeId(rangeId)
		if (!scope) {
			return []
		}

		return scope.capturer.outputCustomCaptured()
	}
}