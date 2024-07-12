import type TS from 'typescript'
import {ObservedChecker} from './observed-checker'
import {helper, ts} from '../../base'
import {Context} from './context'
import {ContextType} from './context-tree'
import {ClassRange} from './class-range'


/** Mark all variables with a context. */
export class ContextVariables {

	readonly context: Context

	/** 
	 * All local variable names, and whether each one was observed.
	 * It can also help to query in which context special variable exists.
	 */
	private variableObserved: Map<string, boolean> = new Map()

	/** 
	 * Whether `this` is observed.
	 * Only available for function-like type of context.
	 */
	readonly thisObserved: boolean

	constructor(context: Context) {
		this.context = context
		this.thisObserved = this.checkThisObserved()

		if (this.context.type === ContextType.FunctionLike) {
			this.checkObservedParameters()
		}
	}

	/** Check whether `this` should be observed. */
	private checkThisObserved(): boolean {
		let node = this.context.node

		// Inherit from parent context.
		if (this.context.type !== ContextType.FunctionLike) {
			return this.context.parent?.variables.thisObserved ?? false
		}

		let thisParameter = (node as TS.FunctionLikeDeclaration).parameters.find(param => {
			return ts.isIdentifier(param.name) && param.name.text === 'this'
		})

		// If declared `this` parameter.
		if (thisParameter && thisParameter.type) {

			// Directly declare type as `Observed<>`.
			let typeNode = thisParameter.type
			if (ObservedChecker.isTypeNodeObserved(typeNode)) {
				return true
			}

			// Class type resolved implements `Observed<>`.
			else if (ts.isTypeReferenceNode(typeNode)) {
				let clsDecl = helper.resolveOneDeclaration(typeNode.typeName, ts.isClassDeclaration)
				if (clsDecl && helper.isClassImplemented(clsDecl, 'Observed', '@pucelle/ff')) {
					return true
				}
			}
		}

		// In the range of an observed class.
		else if (ClassRange.isObserved()) {
			return true
		}

		return false
	}

	/** Whether has declared a local variable by name. */
	hasLocalVariable(name: string): boolean {
		return this.variableObserved.has(name)
	}

	/** Get whether has observed a declared local variable by name. */
	isLocalVariableObserved(name: string): boolean {
		return this.variableObserved.get(name)!
	}

	/** Whether has declared a variable by name. */
	hasVariable(name: string): boolean {
		if (this.variableObserved.has(name)) {
			return true
		}

		if (this.context.parent) {
			return this.context.parent.variables.hasVariable(name)
		}
		
		return false
	}

	/** 
	 * Get a non-repetitive variable name.
	 * Current context must be a found context that can contain variables.
	 */
	makeUniqueVariable(prefix: string): string {
		let seed = 0
		let name = prefix + seed++

		while (this.context.variables.hasVariable(name)) {
			name = prefix + seed++
		}

		this.variableObserved.set(name, false)

		return name
	}

	/** Get whether has observed a declared variable by name. */
	isVariableObserved(name: string): boolean {
		if (this.variableObserved.has(name)) {
			return this.variableObserved.get(name)!
		}

		if (this.context.parent) {
			return this.context.parent.variables.isVariableObserved(name)
		}
		
		return false
	}

	private checkObservedParameters() {
		let node = this.context.node

		// Examine this parameter.
		// Assume `this` is observed.
		// `var a = this.a` -> observed.
		// `var b = a.b` -> observed.
		if (ts.isMethodDeclaration(node)
			|| ts.isFunctionDeclaration(node)
			|| ts.isFunctionExpression(node)
			|| ts.isArrowFunction(node)
			|| ts.isSetAccessorDeclaration(node)
		) {
			let parameters = node.parameters

			// If re-declare `this` parameter.
			for (let param of parameters) {
				let typeNode = param.type
				let observed = false

				if (typeNode) {
					observed = ObservedChecker.isTypeNodeObserved(typeNode)
				}

				this.variableObserved.set(helper.getText(param.name), observed)
			}
		}

		// Broadcast observed from parent calling to all parameters.
		// `a.b.map((item) => {return item.value})`
		// `a.b.map(item => item.value)`
		// `a.b.map(function(item){return item.value})`
		if (ts.isFunctionDeclaration(node)
			|| ts.isFunctionExpression(node)
			|| ts.isArrowFunction(node)
		) {
			if (ts.isCallExpression(node.parent)) {
				let exp = node.parent.expression
				if (helper.isPropertyAccessing(exp)) {

					// `a.b`
					let callFrom = exp.expression
					if (ObservedChecker.isObserved(callFrom)) {
						let parameters = node.parameters
						this.makeParametersObserved(parameters)
					}
				}
			}
		}
	}

	/** Remember observed parameters. */
	private makeParametersObserved(parameters: TS.NodeArray<TS.ParameterDeclaration>) {
		for (let param of parameters) {
			let beObject = helper.isNodeObjectType(param)
			if (beObject) {
				this.variableObserved.set(helper.getText(param.name), true)
			}
		}
	}

	/** Visit a parameter. */
	visitParameter(node: TS.ParameterDeclaration) {
		let observed = ObservedChecker.isParameterObserved(node)
		this.variableObserved.set(helper.getText(node.name), observed)
	}

	/** Visit a variable. */
	visitVariable(node: TS.VariableDeclaration) {
		let observed = ObservedChecker.isVariableDeclarationObserved(node)
		let names = ObservedChecker.getVariableDeclarationNames(node)

		for (let name of names) {
			this.variableObserved.set(name, observed)
		}
	}
}
