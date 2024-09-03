import type TS from 'typescript'
import {defineVisitor, ts} from '../../base'
import {ContextTree, ContextTypeMask} from './context-tree'
import {AccessReferences} from './access-references'


/** It add dependency tracking codes to source file. */
defineVisitor(function(node: TS.Node) {

	// Initialize
	if (ts.isSourceFile(node)) {
		ContextTree.init()
		AccessReferences.init()
	}

	// Check contextual state, must after observable state pushing.
	let type = ContextTree.checkContextType(node)
	if (type !== ContextTypeMask.None) {
		ContextTree.createContext(type, node)
	}

	// after visited children.
	return () => {
		ContextTree.visitNode(node)

		if (type !== ContextTypeMask.None) {
			ContextTree.pop()
		}
	}
})