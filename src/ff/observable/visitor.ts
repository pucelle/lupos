import type TS from 'typescript'
import {defineVisitor, ts} from '../../core'
import {ContextTree, ContextTypeMask} from './context-tree'
import {AccessReferences} from './access-references'
import {TrackingPatch} from './tracking-patch'


/** It add dependency tracking codes to source file. */
defineVisitor(function(node: TS.Node) {

	// Initialize
	if (ts.isSourceFile(node)) {
		ContextTree.init()
		AccessReferences.init()
		TrackingPatch.init()
	}

	// Check context type.
	let rangedType = ContextTree.checkRangedContextType(node)
	if (rangedType !== 0) {
		ContextTree.createContext(rangedType, node)
	}

	// Check context type.
	let type = ContextTree.checkContextType(node)
	if (type !== 0) {
		ContextTree.createContext(type, node)
	}
	
	// after visited children.
	return () => {
		ContextTree.visitNode(node)

		// Non content range type.
		if (type !== 0) {
			ContextTree.pop()
		}

		// Current context is a content range.
		// It get popped on when match range end node.
		if (ContextTree.current
			&& (ContextTree.current.type & ContextTypeMask.ContentRange)
		) {
			if (node === ContextTree.current.rangeEndNode) {
				ContextTree.pop()
			}
		}
	}
})