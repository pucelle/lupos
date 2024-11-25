import type * as ts from 'typescript'
import {VisitTree} from '../../core'
import {TrackingScope} from './scope'
import {ListMap} from '../../lupos-ts-module'
import {TrackingScopeTypeMask} from './scope-tree'


/** Describe a tracking range. */
export interface TrackingRange {
	id: number
	container: ts.Node
	startNode: ts.Node
	endNode: ts.Node
	scopeType: TrackingScopeTypeMask
	outputWay: CapturedOutputWay
}

/** How to output captured. */
export enum CapturedOutputWay {
	FollowNode,
	Custom,
}


export namespace TrackingRanges {

	let rangeIdSeed = 0

	/** All ranges, group by start node. */
	const RangesByStartNode: ListMap<ts.Node, TrackingRange> = new ListMap()

	/** Range id -> scope. */
	const ScopeByRangeIdMap: Map<number, TrackingScope> = new Map()


	/** Initialize before visiting a new source file. */
	export function init() {
		RangesByStartNode.clear()
		ScopeByRangeIdMap.clear()
	}


	/** 
	 * Mark a scope by node range, later will be made as a `Range` scope.
	 * Note must mark before scope visitor visit it.
	 * Return range id.
	 */
	export function markRange(
		container: ts.Node,
		startNode: ts.Node,
		endNode: ts.Node,
		scopeType: 0 | TrackingScopeTypeMask,
		outputWay: CapturedOutputWay
	): number {
		let existed = RangesByStartNode.get(startNode)

		let sameRange = existed?.find(r => r.startNode === startNode && r.endNode === endNode)
		if (sameRange) {
			sameRange.scopeType |= scopeType
			sameRange.outputWay = outputWay
			return sameRange.id
		}

		let id = ++rangeIdSeed

		RangesByStartNode.add(startNode, {
			id,
			container,
			startNode,
			endNode,
			scopeType: scopeType | TrackingScopeTypeMask.Range,
			outputWay
		})

		if (existed) {
			let ranges = RangesByStartNode.get(startNode)!
			ranges.sort((a, b) => {
				let ai = VisitTree.getIndex(a.endNode)
				let bi = VisitTree.getIndex(b.endNode)

				// Order by wider -> narrower.
				return VisitTree.isPrecedingOfInChildFirstOrder(ai, bi) ? 1 : -1
			})
		}

		return id
	}

	/** Get content ranges by start node. */
	export function getRangesByStartNode(startNode: ts.Node): TrackingRange[] | undefined {
		let ranges = RangesByStartNode.get(startNode)
		return ranges
	}

	/** Get tracking scope by range id. */
	export function setScopeByRangeId(id: number, scope: TrackingScope) {
		return ScopeByRangeIdMap.set(id, scope)
	}

	/** Set tracking scope by range id. */
	export function getScopeByRangeId(id: number): TrackingScope | undefined {
		return ScopeByRangeIdMap.get(id)
	}
}