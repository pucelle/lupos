import type * as ts from 'typescript'
import {TSHelper} from '../../base'
import {ContextualNode, ObservedContext} from './context'
import {ObservedChecker, PropertyAccessingType} from './checker'


const ContextStack: ObservedContext[] = []
let currentContext: ObservedContext | null = null


/** Whether node represents a context. */
export function isContextualNode(node: ts.Node, helper: TSHelper): node is ContextualNode {
	return helper.ts.isSourceFile(node)
		|| helper.ts.isMethodDeclaration(node)
		|| helper.ts.isFunctionDeclaration(node)
		|| helper.ts.isArrowFunction(node)
		|| helper.ts.isModuleDeclaration(node)
		|| helper.ts.isBlock(node)
}


/** Create a context from node and push to stack. */
export function pushObservedContext(node: ContextualNode, checker: ObservedChecker) {
	let context = new ObservedContext(node, currentContext, checker)

	if (currentContext) {
		ContextStack.push(currentContext)
	}

	currentContext = context
}


/** Pop context. */
export function popObservedContext() {
	currentContext = ContextStack.pop()!
}


/** Returns whether a property accessing is observed. */
export function isAccessingObserved(node: PropertyAccessingType) {
	if (currentContext) {
		return currentContext.isAccessingObserved(node)
	}
	else {
		return false
	}
}


/** Add a get expression. */
export function addGetExpressions(node: PropertyAccessingType) {
	if (currentContext) {
		currentContext.addGetExpressions(node)
	}
}