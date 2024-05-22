import type * as ts from 'typescript'
import {isObservedClass} from './class'
import {CanObserveNode, ObservedChecker, PropertyAccessingNode} from './checker'
import {TSHelper, SourceFileModifier} from '../../base'
import {GetExpressionsBuilder} from './get-builder'


/** 
 * Nodes than will initialize a context.
 * Both method and function contain a block, include them because of wanting to examine parameters.
 */
export type ContextualNode = ts.SourceFile | ts.MethodDeclaration | ts.FunctionDeclaration | ts.FunctionExpression
	| ts.GetAccessorDeclaration| ts.SetAccessorDeclaration | ts.ArrowFunction | ts.ModuleDeclaration | ts.Block


/** 
 * A source file, a method, or a namespace, a function, an arrow function
 * create a context. a context will extend from it's parent context.
 */
export class ObservedContext {

	readonly depth: number
	readonly node: ts.Node
	readonly parent: ObservedContext | null
	readonly helper: TSHelper
	readonly modifier: SourceFileModifier

	/** Whether `this` is observed. */
	thisObserved: boolean = false

	/** 
	 * Whether function has nothing returned.
	 * If a method returns nothing, it should not observe get expressions.
	 */
	nothingReturned: boolean = false

	/** 
	 * All local variable names, and whether observed.
	 * Also knows in which context special variable exist.
	 */
	private variableObserved: Map<string, boolean> = new Map()

	/** All get expressions. */
	private getExpressions: PropertyAccessingNode[] = []

	constructor(node: ts.Node, parent: ObservedContext | null, modifier: SourceFileModifier) {
		this.depth = parent ? parent.depth + 1 : 0
		this.node = node
		this.parent = parent
		this.helper = modifier.helper
		this.modifier = modifier

		this.checkThisObserved()
		this.checkFunctionReturned()
		this.checkObservedVariables()
	}

	/** Analysis for whether `this` is observed. */
	private checkThisObserved() {
		if (this.helper.ts.isMethodDeclaration(this.node)
			|| this.helper.ts.isFunctionDeclaration(this.node)
			|| this.helper.ts.isFunctionExpression(this.node)
			|| this.helper.ts.isGetAccessorDeclaration(this.node)
			|| this.helper.ts.isSetAccessorDeclaration(this.node)
		) {
			let thisParameter = this.node.parameters.find(param => param.name.getText() === 'this')

			// If re-declare `this` parameter.
			if (thisParameter && thisParameter.type) {
				let type = thisParameter.type
				this.thisObserved = ObservedChecker.isTypeNodeObserved(type, this.helper)
			}
			else if (isObservedClass()) {
				this.thisObserved = true
			}
		}
		else if (this.parent) {
			this.thisObserved = this.parent.thisObserved
		}
	}

	/** Check whether function has something returned. */
	private checkFunctionReturned() {
		if (this.helper.ts.isMethodDeclaration(this.node)
			|| this.helper.ts.isFunctionDeclaration(this.node)
			|| this.helper.ts.isFunctionExpression(this.node)
			|| this.helper.ts.isArrowFunction(this.node)
		) {
			let type = this.helper.getReturnType(this.node)
			this.nothingReturned = !!(type && (type.getFlags() & this.helper.ts.TypeFlags.Void))
		}
		else if (this.helper.ts.isSetAccessorDeclaration(this.node)) {
			this.nothingReturned = true
		}
		else if (this.parent) {
			this.nothingReturned = this.parent.nothingReturned
		}
	}

	private checkObservedVariables() {

		// Assume `this` is observed.
		// `var a = this.a` -> observed.
		// `var b = a.b` -> observed.

		// Examine parameters.
		if (this.helper.ts.isMethodDeclaration(this.node)
			|| this.helper.ts.isFunctionDeclaration(this.node)
			|| this.helper.ts.isFunctionExpression(this.node)
			|| this.helper.ts.isArrowFunction(this.node)
			|| this.helper.ts.isSetAccessorDeclaration(this.node)
		) {
			let parameters = this.node.parameters

			// If re-declare `this` parameter.
			for (let param of parameters) {
				let type = param.type
				let observed = false

				if (type) {
					observed = ObservedChecker.isTypeNodeObserved(type, this.helper)
				}

				this.variableObserved.set(param.name.getText(), observed)
			}
		}

		if (this.helper.ts.isFunctionDeclaration(this.node)
			|| this.helper.ts.isFunctionExpression(this.node)
			|| this.helper.ts.isArrowFunction(this.node)
		) {
			// Broadcast observed from parent calling to all parameters.
			// `a.b.map((item) => {return item.value})`
			// `a.b.map(item => item.value)`
			// `a.b.map(function(item){return item.value})`
			if (this.helper.ts.isCallExpression(this.node.parent)) {
				let exp = this.node.parent.expression
				if (this.helper.ts.isPropertyAccessExpression(exp) || this.helper.ts.isElementAccessExpression(exp)) {

					// `a.b`
					let callFrom = exp.expression
					if (ObservedChecker.canObserve(callFrom, this.helper) && this.isAnyObserved(callFrom)) {
						let parameters = this.node.parameters
						this.makeParametersObserved(parameters)
					}
				}
			}
		}

		// Check each variable declarations.
		if (this.helper.ts.isBlock(this.node)) {
			for (let stat of this.node.statements) {
				if (!this.helper.ts.isVariableStatement(stat)) {
					continue
				}

				for (let item of stat.declarationList.declarations) {
					if (item.pos === -1) {
						continue
					}

					let observed = ObservedChecker.isVariableDeclarationObserved(item, this)
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

		// Newly appended node, not observe always.
		if (node.pos === -1) {
			return false
		}
		else if (node.kind === this.helper.ts.SyntaxKind.ThisKeyword) {
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

	/** Returns whether a property accessing is observed. */
	isAccessingObserved(node: PropertyAccessingNode): boolean {
		return ObservedChecker.isAccessingObserved(node, this)
	}

	/** Returns whether an identifier, this, or a property accessing is observed. */
	isAnyObserved(node: CanObserveNode): boolean {
		if (this.helper.ts.isPropertyAccessExpression(node) || this.helper.ts.isElementAccessExpression(node)) {
			return this.isAccessingObserved(node)
		}
		else if (this.helper.ts.isCallExpression(node)) {
			return ObservedChecker.isCallObserved(node, this.helper)
		}
		else {
			return this.isIdentifierObserved(node)
		}
	}

	/** Add a get expression, already tested and knows should observe it. */
	addGetExpression(node: PropertyAccessingNode) {
		let context = //this.getLiftedContext(node) || 
		this
		context.addGetExpressionToSelf(node)
	}

	/** Add a get expression to current get expression list. */
	addGetExpressionToSelf(node: PropertyAccessingNode) {
		this.getExpressions.push(node)
	}

	/** Lift node to outer context. */
	// private getLiftedContext(node: CanObserveNode): ObservedContext | null {
	// 	if (this.helper.ts.isPropertyAccessExpression(node) || this.helper.ts.isElementAccessExpression(node)) {
	// 		let exp = node.expression

	// 		if (ObservedChecker.canObserve(exp, this.helper)) {
	// 			return this.getLiftedContext(exp)
	// 		}
	// 		else {
	// 			return null
	// 		}
	// 	}
	// 	else {
	// 		if (node.pos === -1) {
	// 			return null
	// 		}
	// 		// else if (node.kind === this.helper.ts.SyntaxKind.ThisKeyword) {
	// 		// 	if (this.parent && this.helper.ts.isArrowFunction(this.parent.node)) {
	// 		// 		return this.parent.parent!.getLiftedContext(node)
	// 		// 	}
	// 		// 	else {
	// 		// 		return this
	// 		// 	}
	// 		// }
	// 		// else if (this.variableObserved.has(node.getText())) {
	// 		// 	return this
	// 		// }
	// 		else if (this.parent) {
	// 			return this.parent.getLiftedContext(node)
	// 		}
	// 		else {
	// 			return null
	// 		}
	// 	}
	// }

	/** Output all expressions. */
	outputExpressionsToNode(node: ts.Node): ts.Node {
		if (this.getExpressions.length === 0) {
			return node
		}

		if (this.nothingReturned) {
			return node
		}

		this.modifier.addNamedImport('onGetGrouped', '@pucelle/ff')
		let onGetStats = GetExpressionsBuilder.buildStatements(this.getExpressions, this.helper)

		if (this.helper.ts.isBlock(node)) {
			return this.modifier.addStatementsBeforeReturning(node, onGetStats)
		}
		else if (this.helper.ts.isArrowFunction(node)) {
			return this.modifier.addStatementsToArrowFunction(node, onGetStats)
		}
		else {
			throw new Error(`Node of kind "${node.kind}" cant output expressions!`)
		}
	}
}
