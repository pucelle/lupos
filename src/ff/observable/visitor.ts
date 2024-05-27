import type ts from 'typescript'
import {SourceFileModifier} from '../../base'
import {Context} from './context'
import {ClassRange} from './class-range'
import {ContextRange, ContextType} from './context-range'


/** 
 * It add observable codes to source file.
 * Cant mix with other visitors because it requires full type references to work.
 */
export function observableVisitor(node: ts.SourceFile, modifier: SourceFileModifier): ts.SourceFile {
	let helper = modifier.helper
	let ts = helper.ts

	function visitNode(node: ts.Node): () => ts.Node | ts.Node[] {

		// Check whether in the range of an observed class.
		let beClass = ts.isClassDeclaration(node)
		if (beClass) {
			ClassRange.pushMayObserved(node as ts.ClassDeclaration, helper)
		}

		// Check contextual state, must after observable state pushing.
		let type = ContextRange.checkContextType(node, helper)
		let context: Context | null = null

		if (type !== null) {
			context = ContextRange.createdContextToPush(type, node, modifier)
		}

		let outputCallbacks = visitChildren(node)

		if (type !== null) {
			ContextRange.pop()
		}

		// Quit class range.
		if (beClass) {
			ClassRange.pop()
		}

		return () => {
			let output = outputCallbacks.map(c => c())
			let index = 0

			// replace children by callback outputted.
			let newNode = ts.visitEachChild(node, () => output[index++], modifier.context)
			
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
	function visitChildren(node: ts.Node): (() => ts.Node | ts.Node[])[] {

		// Add get expressions.
		if (helper.ts.isPropertyAccessExpression(node)
			|| helper.ts.isElementAccessExpression(node)
		) {
			ContextRange.addGetExpression(node)
		}

		// Visit children recursively, but not output immediately.
		let outputCallbacks: (() => ts.Node | ts.Node[])[] = []

		// Create a conditional context context and visit it's expressions.
		if (ts.isCaseOrDefaultClause(node)) {
			if (ts.isCaseClause(node)) {
				outputCallbacks.push(visitNode(node.expression))
			}

			ContextRange.createdContextToPush(ContextType.ConditionalContent, node, modifier)

			for (let child of node.statements) {
				outputCallbacks.push(visitNode(child))
			}

			ClassRange.pop()
		}
		else {
			ts.visitEachChild(node, child => {
				outputCallbacks.push(visitNode(child))
				return child
			}, modifier.context)
		}
	
		return outputCallbacks
	}


	let rootContext = new Context(ContextType.BlockLike, node, null, modifier)
	let callback = visitNode(node)

	// Do optimize before final output.
	rootContext.optimize()

	let newSourceFile = callback() as ts.SourceFile
	return newSourceFile
}