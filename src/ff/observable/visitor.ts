import type TS from 'typescript'
import {transformContext, ts} from '../../base'
import {ClassRange} from './class-range'
import {ContextTree, ContextType} from './context-tree'
import {VisitingTree} from './visiting-tree'
import {Interpolator} from './interpolator'


/** 
 * It add observable codes to source file.
 * Cant mix with other visitors because it requires full type references to work.
 */
export function observableVisitor(node: TS.SourceFile): TS.SourceFile {
	function visitNode(node: TS.Node) {
		VisitingTree.toNext(node)

		// Check whether in the range of an observed class.
		let beClass = ts.isClassDeclaration(node)
		if (beClass) {
			ClassRange.pushMayObserved(node as TS.ClassDeclaration)
		}

		// Check contextual state, must after observable state pushing.
		let type = ContextTree.checkContextType(node)
		if (type !== null) {
			ContextTree.createContext(type, node)
		}

		visitChildren(node)

		// Must after visiting children.
		ContextTree.visitNode(node)

		if (type !== null) {
			ContextTree.pop()
		}

		// Quit class range.
		if (beClass) {
			ClassRange.pop()
		}
	}


	/** Visit all children of specified node. */
	function visitChildren(node: TS.Node) {
		VisitingTree.toChild()

		// Create a case context and visit `case` expressions.
		// This context cant be outputted directly by output callback,
		// should implement a special `case` type of output at parent context.
		if (ts.isCaseOrDefaultClause(node)) {
			if (ts.isCaseClause(node)) {
				ContextTree.createContext(ContextType.ConditionalCondition, node)
				visitNode(node.expression)
				ContextTree.pop()
			}

			ContextTree.createContext(ContextType.ConditionalContent, node)

			for (let child of node.statements) {
				visitNode(child)
			}

			ContextTree.pop()
		}
		else {

			// Note looping `getChildren()` is not working.
			ts.visitEachChild(node, child => {
				visitNode(child)
				return child
			}, transformContext)
		}

		VisitingTree.toParent()
	}


	VisitingTree.initialize()
	ContextTree.initialize()
	Interpolator.initialize()

	visitNode(node)

	return Interpolator.output(0) as TS.SourceFile
}