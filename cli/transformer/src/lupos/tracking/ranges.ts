import type ts from 'typescript'
import {VisitTree} from '../../core'
import {TrackingArea} from './area'
import {ListMap} from '../../lupos-ts-module'
import {TrackingAreaTypeMask} from './area-tree'


/** 
 * Describe a tracking range, which starts from a node, and ends at another node.
 * Sometimes a single node can't cover complex tracking area, so we have a range as an addition.
 */
export interface TrackingRange {
	id: number
	container: ts.Node
	startNode: ts.Node
	endNode: ts.Node
	areaType: TrackingAreaTypeMask
}


export namespace TrackingRanges {

	let rangeIdSeed = 0

	/** All ranges, group by start node. */
	const RangesByStartNode: ListMap<ts.Node, TrackingRange> = new ListMap()

	/** Range id -> area. */
	const AreaByRangeIdMap: Map<number, TrackingArea> = new Map()


	/** Initialize before visiting a new source file. */
	export function init() {
		RangesByStartNode.clear()
		AreaByRangeIdMap.clear()
	}


	/** 
	 * Mark a area by node range, later will be made as a `Range` area.
	 * Note must mark before area visitor visit it.
	 * Return range id.
	 */
	export function markRange(
		container: ts.Node,
		startNode: ts.Node,
		endNode: ts.Node,
		areaType: 0 | TrackingAreaTypeMask
	): number {
		let existed = RangesByStartNode.get(startNode)

		let sameRange = existed?.find(r => r.startNode === startNode && r.endNode === endNode)
		if (sameRange) {
			sameRange.areaType |= areaType
			return sameRange.id
		}

		let id = ++rangeIdSeed

		RangesByStartNode.add(startNode, {
			id,
			container,
			startNode,
			endNode,
			areaType: areaType | TrackingAreaTypeMask.Range,
		})

		if (existed) {
			let ranges = RangesByStartNode.get(startNode)!
			ranges.sort((a, b) => {

				// Order by wider -> narrower.
				return VisitTree.isPrecedingOfInChildFirstOrder(a.endNode, b.endNode) ? 1 : -1
			})
		}

		return id
	}

	/** Get content ranges by start node. */
	export function getRangesByStartNode(startNode: ts.Node): TrackingRange[] | undefined {
		let ranges = RangesByStartNode.get(startNode)
		return ranges
	}

	/** Whether a node belongs to an already marked range of the given kind. */
	export function isInsideRange(node: ts.Node, type: TrackingAreaTypeMask): boolean {
		for (let range of RangesByStartNode.values()) {
			if (range.areaType & type && node.pos >= range.startNode.pos && node.end <= range.endNode.end) {
				return true
			}
		}
		return false
	}

	/** Get tracking area by range id. */
	export function setAreaByRangeId(id: number, area: TrackingArea) {
		return AreaByRangeIdMap.set(id, area)
	}

	/** Set tracking area by range id. */
	export function getAreaByRangeId(id: number): TrackingArea | undefined {
		return AreaByRangeIdMap.get(id)
	}
}
