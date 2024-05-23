import type * as ts from 'typescript'
import {SourceFileModifier, TSHelper, applyVisitors} from '../../base'
import {ObservableContext} from './context'


/** 
 * It add observable codes to source file.
 * Cant mix with other visitors because it requires full type references to work.
 */
export function observableSourceFileVisitor(node: ts.SourceFile, modifier: SourceFileModifier): ts.SourceFile {
		
	function nodeVisitor(node: ts.Node): ts.Node | ts.Node[] {

		// Check whether in the range of an observed class.
		let beClass = ts.isClassDeclaration(node)
		if (beClass) {
			pushMayObservedClass(node as ts.ClassDeclaration, helper)
		}


		let nodes = applyVisitors(node, modifier)!
		let newNodes: ts.Node[] = []

		for (let node of nodes) {

			// Check contextual state, must after observable state pushing.
			let beContextualNode = isContextualNode(node, helper)
			if (beContextualNode) {
				pushObservedContext(node as ContextualNode, modifier)
			}

			node = ts.visitEachChild(node, visit, ctx)

			if (beContextualNode) {
				node = outputExpressionsToNode(node as ContextualNode)
				popObservedContext()
			}

			newNodes.push(node)
		}

		nodes = newNodes

		if (beClass) {
			popMayObservedClass()
		}

		// If only one node and package it to an array, it represents a new node,
		// and types will not be eliminated even not referenced.
		return nodes.length === 1 ? nodes[0] : nodes
	}

	let rootContext = new ObservableContext(node, null, modifier)

	return modifier.helper.ts.visitEachChild(node, nodeVisitor, modifier.context)
}




/**
 * Examine all property accessing expressions,
 * and add dependencies tracking codes besides.
 */
defineVisitor(

	(node: ts.Node, helper: TSHelper) => {
		return helper.ts.isPropertyAccessExpression(node)
			|| helper.ts.isElementAccessExpression(node)
	},
	(node: PropertyAccessingNode, modifier: SourceFileModifier) => {
		addGetExpression(node)
		return node
	},
)
