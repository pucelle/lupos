import type * as ts from 'typescript'
import {TSHelper} from '../base/ts-helper'
import {isObservedClass} from './observed-class'
import {ObservedChecker} from './observed-checker'


/** Nodes than will initialize a context. */
type ContextualNode = ts.SourceFile | ts.MethodDeclaration | ts.FunctionDeclaration
	| ts.ArrowFunction | ts.ModuleDeclaration | ts.Block


/** 
 * A source file, a method, or a namespace, a function, an arrow function
 * create a context, a context will extend from it's parent context.
 */
class ObservedContext {

	private readonly node: ts.Node
	private readonly parent: ObservedContext | null
	private readonly helper: TSHelper
	private readonly checker: ObservedChecker
	private readonly ts: typeof ts

	/** Whether `this` is observed. */
	private thisObserved: boolean = false

	/** All local variable names, and whether observed. */
	private variableObserved: Map<string, boolean> = new Map()

	constructor(node: ts.Node, parent: ObservedContext | null, helper: TSHelper, checker: ObservedChecker) {
		this.node = node
		this.parent = parent
		this.helper = helper
		this.checker = checker
		this.ts = helper.ts

		this.checkThisObserved()
		this.checkObservedVariables()
	}

	/** Analysis for whether `this` is observed. */
	private checkThisObserved() {
		if (this.ts.isMethodDeclaration(this.node) || this.ts.isFunctionDeclaration(this.node)) {
			let thisParameter = this.node.parameters.find(param => param.name.getText() === 'this')

			// If re-declare `this` parameter.
			if (thisParameter && thisParameter.type) {
				let type = thisParameter.type
				this.thisObserved = this.checker.isTypeNodeObserved(type)
			}
		}
		else if (isObservedClass()) {
			this.thisObserved = true
		}
	}

	private checkObservedVariables() {

		// Assume `this` is observed.
		// `var a = this.a` -> observed.
		// `var b = a.b` -> observed.

		// Examine parameters.
		if (this.ts.isMethodDeclaration(this.node)
			|| this.ts.isFunctionDeclaration(this.node)
			|| this.ts.isArrowFunction(this.node)
		) {
			let parameters = this.node.parameters

			// If re-declare `this` parameter.
			for (let param of parameters) {
				let type = param.type
				let observed = false

				if (type) {
					observed = this.checker.isTypeNodeObserved(type)
				}

				this.variableObserved.set(param.name.getText(), observed)
			}

			// Broadcast observed to all parameters.
			// `a.b.map((item) => {return item.value})`
			// `a.b.map(item => item.value)`
			// `a.b.map(function(item){return item.value})`
			if (this.parent && this.ts.isCallExpression(this.parent.node)) {
				let exp = this.parent.node.expression
				if (this.ts.isPropertyAccessExpression(exp)) {

					// `a.b`
					let callFrom = exp.expression
					if (this.checker.canBeObserved(callFrom) && this.parent.isObserved(callFrom)) {
						this.makeParametersObserved(parameters)
					}
				}
			}
		}

		// Check each variable declarations.
		for (let child of this.node.getChildren()) {
			if (!this.ts.isVariableStatement(child)) {
				continue
			}

			for (let item of child.declarationList.declarations) {
				let observed = this.checker.isVariableDeclarationObserved(item)
				this.variableObserved.set(item.name.getText(), observed)
			}
		}
	}

	private makeParametersObserved(parameters: ts.NodeArray<ts.ParameterDeclaration>) {
		for (let param of parameters) {
			let beObject = this.helper.isNodeObjectType(param)
			if (beObject) {
				this.variableObserved.set(param.name.getText(), true)
			}
		}
	}

	/** 
	 * Check whether an identifier or `this` is observed.
	 * Node must be the top most property access expression.
	 * E.g., for `a.b.c`, sub expression `b.c` is not allowed.
	 */
	private isIdentifierObserved(node: ts.Identifier | ts.ThisExpression): boolean {
		if (node.kind === this.ts.SyntaxKind.ThisKeyword) {
			return this.thisObserved
		}
		else if (this.variableObserved.has(node.getText())) {
			return this.variableObserved.get(node.getText())!
		}
		else if (this.parent) {
			return this.parent.isIdentifierObserved(node)
		}
		else {
			return false
		}
	}

	/** 
	 * Check whether a property access expression is observed.
	 * Node must be the top most property access expression.
	 * E.g., for `a.b.c`, sub expression `b.c` is not allowed.
	 */
	private getAccessingExpressionObservedState(node: ts.PropertyAccessExpression | ts.ElementAccessExpression):
		{observed: boolean, readonly: boolean}
	{

		// Take `a.b.c` as example.
		let exp = node.expression

		// `a.b`
		if (this.ts.isPropertyAccessExpression(exp)) {

		}

		// `(a as Observed<{b: number}>).b` is not supported, because it's ugly.
		else if (this.ts.isParenthesizedExpression(exp) && this.ts.isAsExpression(exp.expression)) {

		}

		
	}

	/** Returns whether an identifier, this, or a property accessing is observed. */
	isObserved(node: ts.PropertyAccessExpression | ts.ElementAccessExpression | ts.Identifier | ts.ThisExpression): boolean {
		if (this.ts.isPropertyAccessExpression(node) || this.ts.isElementAccessExpression(node)) {
			return this.getAccessingExpressionObservedState(node)
		}
		else {
			return this.isIdentifierObserved(node)
		}
	}

	/** 
	 * Analysis whether a property access expression is readonly.
	 * Node must be the top most property access expression.
	 * E.g., for `a.b.c`, sub expression `b.c` is not allowed.
	 */
	private checkReadonly(node: ts.PropertyAccessExpression | ts.ElementAccessExpression) {

		// `class A{readonly p}` -> `this.p` and `this['p']` are readonly.
		// `interface A{readonly p}` -> `this.p` and `this['p']` are readonly.
		let name = this.ts.isPropertyAccessExpression(node) ? node.name : node.argumentExpression

		let testFn = ((node: ts.Node) => this.ts.isPropertySignature(node) || this.ts.isPropertyDeclaration(node)) as
			((node: ts.Node) => node is ts.PropertySignature | ts.PropertyDeclaration)

		let nameDecl = this.helper.resolveOneDeclaration(name, testFn)

		if (nameDecl && nameDecl.modifiers?.find(m => m.kind === this.ts.SyntaxKind.ReadonlyKeyword)) {
			return true
		}

		// `b: Readonly<{p: 1}>` -> `b.p` is readonly, not observed.
		// `c: ReadonlyArray<...>` -> `c.?` is readonly, not observed.
		// `d: DeepReadonly<...>` -> `d.?` and `d.?.?` are readonly, not observed.
		let exp = node.expression

		if (this.helper.isNodeReadonlyType(exp)) {
			return true
		}
	}
}


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
export function pushMayObservedContext(node: ContextualNode, helper: TSHelper, checker: ObservedChecker) {
	let context = new ObservedContext(node, currentContext, helper, checker)

	if (currentContext) {
		ContextStack.push(currentContext)
	}

	currentContext = context
}


/** Pop context. */
export function popMayObservedContext() {
	currentContext = ContextStack.pop()!
}