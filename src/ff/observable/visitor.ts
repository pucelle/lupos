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
	function visitNode(node: TS.Node): () => TS.Node | TS.Node[] {
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

		let outputCallbacks = visitChildren(node)
		let currentContext = ContextTree.current!
		let currentIndex = VisitingTree.current.index

		// Must after visiting children.
		ContextTree.visitNode(node)

		if (type !== null) {
			ContextTree.pop()
		}

		// Quit class range.
		if (beClass) {
			ClassRange.pop()
		}

		return () => {
			let outputs = outputCallbacks.map(c => c())
			let index = -1

			// replace children by callback outputted.
			let newNode = ts.visitEachChild(node, () => {
				let output = outputs[++index]
				return Array.isArray(output) && output.length === 1 ? output[0] : output
			}, transformContext)

			return currentContext.output(newNode, currentIndex)
		}
	}


	/** Visit all children of specified node. */
	function visitChildren(node: TS.Node): (() => TS.Node | TS.Node[])[] {
		VisitingTree.toChild()

		// Visit children recursively, but not output immediately.
		let outputCallbacks: (() => TS.Node | TS.Node[])[] = []

		// Create a case context and visit `case` expressions.
		// This context cant be outputted directly by output callback,
		// should implement a special `case` type of output at parent context.
		if (ts.isCaseOrDefaultClause(node)) {
			if (ts.isCaseClause(node)) {
				ContextTree.createContext(ContextType.ConditionalCondition, node)
				outputCallbacks.push(visitNode(node.expression))
				ContextTree.pop()
			}

			ContextTree.createContext(ContextType.ConditionalContent, node)

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
	ContextTree.initialize()
	Interpolator.initialize()

	ContextTree.createContext(ContextType.BlockLike, node)
	let callback = visitNode(node)

	let newSourceFile = callback() as TS.SourceFile
	return newSourceFile
}