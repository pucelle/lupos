import type * as ts from 'typescript'
import {SourceFileModifier, TSHelper} from '../../base'
import {ContextualNode, ObservedContext} from './context'
import {PropertyAccessingNode} from './checker'


const ContextStack: ObservedContext[] = []
let currentContext: ObservedContext | null = null


/** Whether node represents a context. */
export function isContextualNode(node: ts.Node, helper: TSHelper): node is ContextualNode {
	return helper.ts.isSourceFile(node)
		|| helper.ts.isMethodDeclaration(node)
		|| helper.ts.isFunctionDeclaration(node)
		|| helper.ts.isFunctionExpression(node)
		|| helper.ts.isGetAccessorDeclaration(node)
		|| helper.ts.isSetAccessorDeclaration(node)
		|| helper.ts.isArrowFunction(node)
		|| helper.ts.isModuleDeclaration(node)
		|| helper.ts.isBlock(node)
}


/** Create a context from node and push to stack. */
export function pushObservedContext(node: ContextualNode, modifier: SourceFileModifier) {
	let context = new ObservedContext(node, currentContext, modifier)

	if (currentContext) {
		ContextStack.push(currentContext)
	}

	currentContext = context
}


/** Pop context. */
export function popObservedContext() {
	currentContext = ContextStack.pop()!
}


/** Add a get expression. */
export function addGetExpression(node: PropertyAccessingNode) {
	if (currentContext && currentContext.isAccessingObserved(node)) {
		currentContext.addGetExpression(node)
	}
}


/** Output expressions. */
export function outputExpressionsToNode(node: ts.Node) {
	if (currentContext) {
		return currentContext.outputExpressionsToNode(node)
	}

	return node
}