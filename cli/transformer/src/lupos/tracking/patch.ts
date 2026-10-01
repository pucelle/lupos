import ts from 'typescript'
import {ObservedChecker} from './observed-checker'
import {AccessGrouper} from './access-grouper'
import {ObservedStateMask} from '../decorators/types'
import {CapturedItem} from './capturer'
import {ListMap} from '../../lupos-ts-module'
import {transformContext} from '../../core'


/** 
 * Ignores or adds some tracking additional or build a single tracking node
 * out of normal tracking process,
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

	/** Check whether have ignored outputting. */
	export function hasIgnored(rawNode: ts.Node): boolean {
		return Ignored.has(rawNode)
	}


	/** 
	 * Force re-check node.
	 * `node` can either be an expression or declaration
	 */
	export function forceTrackType(rawNode: ts.Expression | ts.Declaration, type: ObservedStateMask) {
		let currentType = ForceTrackedTypeMask.get(rawNode) ?? 0
		let nextType = currentType | type
		if (nextType !== currentType) {
			ForceTrackedTypeMask.set(rawNode, nextType)
		}
	}

	/** 
	 * Check whether force tracking node with tracking type.
	 * 
	 * `visitElements` specifies whether are visiting parent node of original
	 * to determine whether elements should be observed.
	 */
	export function isForceTrackedAs(rawNode: ts.Node, type: ObservedStateMask): boolean {
		return ((ForceTrackedTypeMask.get(rawNode) ?? 0) & type) > 0
	}


	/** Add custom tracking items. */
	export function addCustomTracking(
		rawNode: ts.Expression,
		type: 'get' | 'set',
		exp?: ts.Expression,
		key?: string | number | ts.Expression
	) {
		let optional = false

		if (exp === undefined || key === undefined) {
			if (!transformContext.helper.access.isAccess(rawNode)) {
				return
			}

			let parts = transformContext.helper.access.getAccessParts(rawNode)
			exp = parts.exp
			key = parts.key
			optional = parts.optional
		}

		let item: CapturedItem = {
			node: rawNode,
			type,
			exp,
			key,
			optional,
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


	/** Output isolated tracking expressions from an access node. */
	export function outputIsolatedTracking(rawNode: ts.Expression, type: 'get' | 'set'): ts.Expression[] {
		if (!transformContext.helper.access.isAccess(rawNode)
			|| !ObservedChecker.getSelfObserved(rawNode)
		) {
			return []
		}

		AccessGrouper.addImport(type)

		let item: CapturedItem = {
			node: rawNode,
			type,
			...transformContext.helper.access.getAccessParts(rawNode),
			referencedAtInternal: false,
		}

		return AccessGrouper.makeExpressions([item], type)
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
