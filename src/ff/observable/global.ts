import type * as ts from 'typescript'
import {SourceFileModifier} from '../../base'
import {ObservableContext} from './context'
import {ContextualNode, PropertyAccessingNode} from './checker'


const ContextStack: ObservableContext[] = []
let currentContext: ObservableContext | null = null



/** Create a context from node and push to stack. */
export function pushObservedContext(node: ContextualNode, modifier: SourceFileModifier) {
	let context = new ObservableContext(node, currentContext, modifier)

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