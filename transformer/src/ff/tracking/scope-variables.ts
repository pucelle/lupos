import type TS from 'typescript'
import {ObservedChecker} from './observed-checker'
import {ts} from '../../core'
import {Helper} from '../../lupos-ts-module'
import {TrackingScope} from './scope'
import {TrackingScopeTypeMask} from './scope-tree'


/** Mark all variables with a scope. */
export class TrackingScopeVariables {

	readonly scope: TrackingScope

	/** 
	 * All local variable names, and whether each one was observed.
	 * It can also help to query in which scope special variable exists.
	 */
	private variableObserved: Map<string, boolean> = new Map()

	/** 
	 * Whether `this` is observed.
	 * Broadcast to descendant non-function scopes.
	 */
	readonly thisObserved: boolean

	constructor(scope: TrackingScope) {
		this.scope = scope
		this.thisObserved = this.checkThisObserved()
	}

	/** Check whether `this` should be observed. */
	private checkThisObserved(): boolean {
		let node = this.scope.node

		// Inherit from parent scope but not function, but arrow function is allowed.
		if ((this.scope.type & TrackingScopeTypeMask.FunctionLike) === 0
			|| ts.isArrowFunction(node)
		) {
			return this.scope.parent?.variables.thisObserved ?? false
		}

		// Get this parameter.
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
		}

		// If is method of an observed class.
		else if (ts.isClassDeclaration(node.parent)
			&& Helper.cls.isImplemented(node.parent, 'Observed', '@pucelle/ff')
		) {
			return true
		}

		return false
	}

	/** 
	 * Get whether has observed a declared variable by name.
	 * If current scope has no specified variable declared, try find parent scope.
	 */
	isVariableObserved(name: string): boolean {
		if (this.variableObserved.has(name)) {
			return this.variableObserved.get(name)!
		}

		if (this.scope.parent) {
			return this.scope.parent.variables.isVariableObserved(name)
		}
		
		return false
	}

	/** Visit a parameter. */
	visitParameter(node: TS.ParameterDeclaration) {
		let observed = ObservedChecker.isParameterObserved(node)
		this.variableObserved.set(Helper.getFullText(node.name), observed)
	}

	/** Visit a variable. */
	visitVariable(node: TS.VariableDeclaration, fromScope: TrackingScope | null = null) {

		// For Initializer registers variables for whole For Iteration can visit.
		if (this.scope.type & TrackingScopeTypeMask.IterationInitializer) {
			this.scope.parent!.variables.visitVariable(node, this.scope)
			return
		}
	
		let observed = this.checkVariableObserved(node, fromScope)
		let names = Helper.variable.walkDeclarationNames(node)

		for (let {node, name} of names) {
			let nameObserved = ObservedChecker.isDestructedVariableDeclarationObserved(node, observed)
			this.variableObserved.set(name, nameObserved)
		}
	}

	/** Check whether a variable declaration node should be observed. */
	private checkVariableObserved(node: TS.VariableDeclaration, fromScope: TrackingScope | null = null): boolean {

		// `for (item of items)`, broadcast observed from items to item.
		if (fromScope && (fromScope.type & TrackingScopeTypeMask.IterationInitializer) > 0) {
			if (ts.isForOfStatement(this.scope.node)) {
				return ObservedChecker.isObserved(this.scope.node.expression, true)
			}
		}

		return ObservedChecker.isVariableDeclarationObserved(node)
	}
}
