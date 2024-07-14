import type TS from 'typescript'
import {defineVisitor, ts} from '../../base'
import {ContextTree, ContextType} from './context-tree'


/** 
 * It add observable codes to source file.
 * Cant mix with other visitors because it requires full type references to work.
 */
defineVisitor(function(node: TS.Node) {

	// Create `case` / `default` content context.
	if (ts.isCaseOrDefaultClause(node.parent) && node === node.parent.statements[0]) {
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
		if (ts.isCaseOrDefaultClause(node.parent) && node === node.parent.statements[node.parent.statements.length - 1]) {
			ContextTree.pop()
		}
	}
})