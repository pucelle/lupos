import * as ts from 'typescript'
import {defineVisitor} from '../../core'
import {TrackingAreaTree, TrackingAreaTypeMask} from './area-tree'
import {TrackingReferences} from './references'
import {TrackingPatch} from './patch'
import {TrackingRanges} from './ranges'


/** It add dependency tracking codes to source file. */
defineVisitor(function(node: ts.Node) {

	// Initialize
	if (ts.isSourceFile(node)) {
		TrackingAreaTree.init()
		TrackingRanges.init()
		TrackingReferences.init()
		TrackingPatch.init()
	}

	// Check area type.
	let ranges = TrackingRanges.getRangesByStartNode(node)
	if (ranges) {
		for (let range of ranges) {
			TrackingAreaTree.createArea(range.areaType, node, range)
		}
	}

	// Check area type.
	let type = TrackingAreaTree.checkType(node)
	if (type !== 0) {
		TrackingAreaTree.createArea(type, node)
	}
	
	// after visited children.
	return () => {
		TrackingAreaTree.visitNode(node)

		// Non content range type.
		if (type !== 0) {
			TrackingAreaTree.pop()
		}

		// If current area is range type,
		// it get popped on when match range end node.
		while (TrackingAreaTree.current
			&& TrackingAreaTree.current.type & TrackingAreaTypeMask.Range
		) {
			if (node === TrackingAreaTree.current.range!.endNode) {
				TrackingAreaTree.pop()
			}
			else {
				break
			}
		}
	}
})