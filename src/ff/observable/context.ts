import type * as ts from 'typescript'
import {TSHelper} from '../../base/ts-helper'
import {isObservedClass} from './class'
import {CanObserveType, ObservedChecker, PropertyAccessingType} from './checker'
import {SourceFileModifier} from '../../base'


/** 
 * Nodes than will initialize a context.
 * Both method and function contain a block, include them because of wanting to examine parameters.
 */
export type ContextualNode = ts.SourceFile | ts.MethodDeclaration | ts.FunctionDeclaration
	| ts.SetAccessorDeclaration | ts.ArrowFunction | ts.ModuleDeclaration | ts.Block


/** 
 * A source file, a method, or a namespace, a function, an arrow function
 * create a context. a context will extend from it's parent context.
 */
export class ObservedContext {

	readonly node: ts.Node
	readonly parent: ObservedContext | null
	readonly helper: TSHelper
	readonly checker: ObservedChecker
	readonly modifier: SourceFileModifier
	readonly ts: typeof ts

	/** Whether `this` is observed. */
	private thisObserved: boolean = false

	/** 
	 * All local variable names, and whether observed.
	 * Also knows in which context special variable exist.
	 */
	private variableObserved: Map<string, boolean> = new Map()

	/** All get expressions. */
	private getExpressions: PropertyAccessingType[] = []

	constructor(node: ts.Node, parent: ObservedContext | null, checker: ObservedChecker, modifier: SourceFileModifier) {
		this.node = node
		this.parent = parent
		this.checker = checker
		this.helper = checker.helper
		this.modifier = modifier
		this.ts = checker.ts

		this.checkThisObserved()
		this.checkObservedVariables()
	}

	/** Analysis for whether `this` is observed. */
	private checkThisObserved() {
		if (this.ts.isMethodDeclaration(this.node)
			|| this.ts.isFunctionDeclaration(this.node)
			|| this.ts.isSetAccessorDeclaration(this.node)
		) {
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
			|| this.ts.isSetAccessorDeclaration(this.node)
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

			// Broadcast observed from parent calling to all parameters.
			// `a.b.map((item) => {return item.value})`
			// `a.b.map(item => item.value)`
			// `a.b.map(function(item){return item.value})`
			if (this.parent && this.ts.isCallExpression(this.parent.node)) {
				let exp = this.parent.node.expression
				if (this.ts.isPropertyAccessExpression(exp)) {

					// `a.b`
					let callFrom = exp.expression
					if (this.checker.canObserve(callFrom) && this.parent.isAnyObserved(callFrom)) {
						this.makeParametersObserved(parameters)
					}
				}
			}
		}

		// Check each variable declarations.
		if (this.ts.isBlock(this.node)) {
			for (let stat of this.node.statements) {
				if (!this.ts.isVariableStatement(stat)) {
					continue
				}

				for (let item of stat.declarationList.declarations) {
					let observed = this.checker.isVariableDeclarationObserved(item, this)
					this.variableObserved.set(item.name.getText(), observed)
				}
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
	isIdentifierObserved(node: ts.Identifier | ts.ThisExpression): boolean {
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

	/** Returns whether an identifier, this, or a property accessing is observed. */
	isAnyObserved(node: CanObserveType): boolean {
		if (this.ts.isPropertyAccessExpression(node) || this.ts.isElementAccessExpression(node)) {
			return this.isAccessingObserved(node)
		}
		else {
			return this.isIdentifierObserved(node)
		}
	}

	/** Returns whether a property accessing is observed. */
	isAccessingObserved(node: PropertyAccessingType) {
		return this.checker.isAccessingObserved(node, this)
	}

	/** Add a get expression, not tested observed state yet. */
	addGetExpression(node: PropertyAccessingType) {
		if (this.isAccessingObserved(node)) {
			this.getExpressions.push(node)
		}
	}

	/** Output all expressions. */
	outputExpressionsToNode(node: ts.Node): ts.Node {
		if (this.getExpressions.length === 0) {
			return node
		}

		this.modifier.addNamedImport('onGet', '@pucelle/ff')

		let exps = this.getExpressions.map(exp => this.createOnGetExpression(exp))

		if (this.ts.isBlock(node)) {
			return this.modifier.addStatementsBeforeReturning(node, exps)
		}
		else if (this.ts.isArrowFunction(node)) {
			return this.modifier.addStatementsToArrowFunction(node, exps)
		}
		else {
			throw new Error(`Node of kind "${node.kind}" cant output expressions!`)
		}
	}

	/** Create a output `onGet` statement. */
	private createOnGetExpression(node: PropertyAccessingType): ts.ExpressionStatement {
		let factory = this.ts.factory
		let name: ts.Expression

		if (this.ts.isPropertyAccessExpression(node)) {
			name = node.name

			// `a.b`, name is 'b'.
			if (this.ts.isIdentifier(name)) {
				name = factory.createStringLiteral(name.getText())
			}
		}
		else {
			name = node.argumentExpression
		}
		
		return factory.createExpressionStatement(factory.createCallExpression(
			factory.createIdentifier('onGet'),
			undefined,
			[
				node.expression,
				name,
			]
		))
	}
}

