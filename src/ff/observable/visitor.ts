import type TS from 'typescript'
import {defineVisitor, ts} from '../../base'
import {ContextTree, ContextType} from './context-tree'
import {AccessReferences} from './access-references'


/** It add dependency tracking codes to source file. */
defineVisitor(function(node: TS.Node) {

	// Initialize
	if (ts.isSourceFile(node)) {
		ContextTree.initialize()
		AccessReferences.initialize()
	}

	// Create `case` / `default` content context.
	if (node.parent && ts.isCaseOrDefaultClause(node.parent) && node === node.parent.statements[0]) {
		ContextTree.createContext(ContextType.ConditionalContent, node)
	}

	// Check contextual state, must after observable state pushing.
	let type = ContextTree.checkContextType(node)
	if (type !== null) {
		ContextTree.createContext(type, node)
	}

	// after visited children.
	return () => {
		ContextTree.visitNode(node)

		if (type !== null) {
			ContextTree.pop()
		}

		// Pop `case`/`default` content context.
		if (node.parent && ts.isCaseOrDefaultClause(node.parent)
			&& node === node.parent.statements[node.parent.statements.length - 1]
		) {
			ContextTree.pop()
		}
	}
})