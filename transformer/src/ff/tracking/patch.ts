import * as ts from 'typescript'
import {TrackingChecker} from './checker'
import {AccessGrouper} from './access-grouper'
import {TrackingRanges} from './ranges'
import {helper} from '../../core'
import {TrackingType} from './types'
import {CapturedItem} from './capturer'
import {ListMap} from '../../lupos-ts-module'


/** 
 * Ignore some tracking additional,
 * or build a single tracking node.
 */
export namespace TrackingPatch {

	const Ignored: Set<ts.Node> = new Set()
	const ForceTrackedTypeMask: Map<ts.Node, number> = new Map()
	const ForceInstantlyRun: Set<ts.Node> = new Set()
	const CustomCaptured: ListMap<ts.Expression, CapturedItem> = new ListMap()


	/** Initialize after each time source file updated. */
	export function init() {
		Ignored.clear()
		ForceTrackedTypeMask.clear()
		ForceInstantlyRun.clear()
		CustomCaptured.clear()
	}


	/** 
	 * Ignore outputting tracking node.
	 * Note it ignores outputting, not prevent observe checking.
	 */
	export function ignore(rawNode: ts.Node) {
		Ignored.add(rawNode)
	}

	/** Check whether ignored outputting. */
	export function isIgnored(rawNode: ts.Node): boolean {
		return Ignored.has(rawNode)
	}


	/** 
	 * Force re-check node.
	 * `node` can either be an expression or declaration
	 */
	export function forceTrackType(rawNode: ts.Expression | ts.Declaration, type: TrackingType) {
		let currentType = ForceTrackedTypeMask.get(rawNode) ?? 0
		ForceTrackedTypeMask.set(rawNode, currentType | type)
	}

	/** 
	 * Check whether force tracking node with tracking type.
	 * 
	 * `visitElements` specifies whether are visiting parent node of original
	 * to determine whether elements should be observed.
	 */
	export function isForceTrackedAs(rawNode: ts.Node, type: TrackingType): boolean {
		return ((ForceTrackedTypeMask.get(rawNode) ?? 0) & type) > 0
	}


	/** Add custom tracking items. */
	export function addCustomTracking(
		rawNode: ts.Expression,
		type: 'get' | 'set',
		exp?: ts.Expression,
		key?: (string | number)
	) {
		let item: CapturedItem = {
			node: rawNode,
			type,
			exp,
			key,
			referencedAtInternal: false,
		}

		CustomCaptured.add(rawNode, item)
	}

	/** Get custom tracking items by node. */
	export function getCustomTrackingItemsByNode(rawNode: ts.Expression): CapturedItem[] | undefined {
		return CustomCaptured.get(rawNode)
	}

	/** Walk for all custom tracking items. */
	export function walkCustomTrackingItems(): Iterable<CapturedItem> {
		return CustomCaptured.values()
	}


	/** Output isolated tracking expressions. */
	export function outputIsolatedTracking(rawNode: ts.Expression, type: 'get' | 'set'): ts.Expression[] {
		if (!helper.access.isAccess(rawNode)) {
			return []
		}

		if (!TrackingChecker.isAccessMutable(rawNode)) {
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

	/** 
	 * Knows that this function should instantly run,
	 * so should optimize it to move some tracking codes outer.
	 */
	export function forceInstantlyRun(rawNode: ts.FunctionLikeDeclaration) {
		ForceInstantlyRun.add(rawNode)
	}

	/** Check whether a node as a function should be forced to instantly run. */
	export function isForceInstantlyRun(node: ts.Node): boolean {
		return ForceInstantlyRun.has(node)
	}
}