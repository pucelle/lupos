import type TS from 'typescript'
import {ObservedChecker} from './observed-checker'
import {Helper, ts} from '../../base'
import {Context} from './context'
import {ContextTypeMask} from './context-tree'


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
	 * Broadcast to descendant non-function contexts.
	 */
	readonly thisObserved: boolean

	constructor(context: Context) {
		this.context = context
		this.thisObserved = this.checkThisObserved()

		if (this.context.type & ContextTypeMask.FunctionLike) {
			this.checkObservedParameters()
		}
	}

	/** Check whether `this` should be observed. */
	private checkThisObserved(): boolean {
		let node = this.context.node

		// Inherit from parent context but not function, but arrow function is allowed.
		if ((this.context.type & ContextTypeMask.FunctionLike) === 0
			|| ts.isArrowFunction(node)
		) {
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
				let classDecl = Helper.symbol.resolveDeclaration(typeNode.typeName, ts.isClassDeclaration)
				if (classDecl && Helper.cls.isImplemented(classDecl, 'Observed', '@pucelle/ff')) {
					return true
				}
			}
		}

		// Method of an observed class.
		else if (ts.isClassDeclaration(node.parent)
			&& Helper.cls.isImplemented(node.parent, 'Observed', '@pucelle/ff')
		) {
			return true
		}

		return false
	}

	/** 
	 * Get whether has observed a declared variable by name.
	 * If current context has no specified variable declared, try find parent context.
	 */
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
		if (Helper.isFunctionLike(node)) {
			let parameters = node.parameters

			// If re-declare `this` parameter.
			for (let param of parameters) {
				let typeNode = param.type
				let observed = false

				if (typeNode) {
					observed = ObservedChecker.isTypeNodeObserved(typeNode)
				}

				this.variableObserved.set(Helper.getFullText(param.name), observed)
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
				if (Helper.access.isAccess(exp)) {

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
			let beValue = Helper.types.isValueType(Helper.types.getType(param))
			this.variableObserved.set(Helper.getFullText(param.name), !beValue)
		}
	}

	/** Visit a parameter. */
	visitParameter(node: TS.ParameterDeclaration) {
		let observed = ObservedChecker.isParameterObserved(node)
		this.variableObserved.set(Helper.getFullText(node.name), observed)
	}

	/** Visit a variable. */
	visitVariable(node: TS.VariableDeclaration, fromContext: Context | null = null) {

		// For Initializer registers variables for whole For Iteration can visit.
		if (this.context.type & ContextTypeMask.IterationInitializer) {
			this.context.parent!.variables.visitVariable(node, this.context)
			return
		}
	
		let observed = this.checkVariableObserved(node, fromContext)
		let names = Helper.variable.walkDeclarationNames(node)

		for (let name of names) {
			this.variableObserved.set(name, observed)
		}
	}

	/** Check whether a variable declaration node should be observed. */
	private checkVariableObserved(node: TS.VariableDeclaration, fromContext: Context | null = null): boolean {
		if (fromContext && (fromContext.type & ContextTypeMask.IterationInitializer) > 0) {
			if (ts.isForOfStatement(this.context.node)) {
				return ObservedChecker.isObserved(this.context.node.expression)
			}
		}

		return ObservedChecker.isVariableDeclarationObserved(node)
	}
}
