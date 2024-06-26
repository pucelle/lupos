import type TS from 'typescript'
import {transformContext, ts} from '../../base'
import {Context} from './context'
import {ClassRange} from './class-range'
import {ContextTree, ContextType} from './context-tree'
import {VisitingTree} from './visiting-tree'
import {ReferenceTree} from './reference-tree'


/** 
 * It add observable codes to source file.
 * Cant mix with other visitors because it requires full type references to work.
 */
export function observableVisitor(node: TS.SourceFile): TS.SourceFile {
	function visitNode(node: TS.Node): () => TS.Node | TS.Node[] {
		VisitingTree.toNext()

		// Check whether in the range of an observed class.
		let beClass = ts.isClassDeclaration(node)
		if (beClass) {
			ClassRange.pushMayObserved(node as TS.ClassDeclaration)
		}

		// Check contextual state, must after observable state pushing.
		let type = ContextTree.checkContextType(node)
		let context: Context | null = null

		if (type !== null) {
			context = ContextTree.createContextAndPush(type, node)
		}

		let outputCallbacks = visitChildren(node)

		if (type !== null) {
			ContextTree.pop()
		}

		// Quit class range.
		if (beClass) {
			ClassRange.pop()
		}

		return () => {
			let output = outputCallbacks.map(c => c())
			let index = 0

			// replace children by callback outputted.
			let newNode = ts.visitEachChild(node, () => output[index++], transformContext)
			
			// Output by context.
			if (context) {
				return context.outputExpressions(newNode)
			}
			else {
				return newNode
			}
		}
	}


	/** Visit all children of specified node. */
	function visitChildren(node: TS.Node): (() => TS.Node | TS.Node[])[] {
		VisitingTree.toChild()

		// Visit each child node.
		ContextTree.visitChildNode(node)

		// Visit children recursively, but not output immediately.
		let outputCallbacks: (() => TS.Node | TS.Node[])[] = []

		// Create a conditional context and visit `case` expressions.
		// This context cant be outputted directly by output callback,
		// should implement a special `case` type of output at parent context.
		if (ts.isCaseOrDefaultClause(node)) {
			if (ts.isCaseClause(node)) {
				outputCallbacks.push(visitNode(node.expression))
			}

			ContextTree.createContextAndPush(ContextType.CaseContent, node)

			for (let child of node.statements) {
				outputCallbacks.push(visitNode(child))
			}

			ContextTree.pop()
		}
		else {

			// Note looping `getChildren()` is not working.
			ts.visitEachChild(node, child => {
				outputCallbacks.push(visitNode(child))
				return child
			}, transformContext)
		}

		VisitingTree.toParent()
	
		return outputCallbacks
	}


	VisitingTree.initialize()
	ReferenceTree.initialize()

	let rootContext = new Context(ContextType.BlockLike, node, null)
	let callback = visitNode(node)

	// Do optimize before final output.
	rootContext.optimize()

	let newSourceFile = callback() as TS.SourceFile
	return newSourceFile
}