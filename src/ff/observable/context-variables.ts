import type TS from 'typescript'
import {ObservedChecker} from './observed-checker'
import {Helper, ts, VisitTree} from '../../base'
import {Context} from './context'
import {ContextTypeMask} from './context-tree'
import {TrackingPatch} from './tracking-patch'


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

	/** Visit a parameter. */
	visitParameter(node: TS.ParameterDeclaration) {
		let observed = ObservedChecker.isParameterObserved(node)
			|| TrackingPatch.isIndexForceTracked(VisitTree.getIndex(node))

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
			|| TrackingPatch.isIndexForceTracked(VisitTree.getIndex(node))

		let names = Helper.variable.walkDeclarationNames(node)

		for (let {node, name} of names) {
			let nameObserved = ObservedChecker.isDestructedVariableDeclarationObserved(node, observed)
			this.variableObserved.set(name, nameObserved)
		}
	}

	/** Check whether a variable declaration node should be observed. */
	private checkVariableObserved(node: TS.VariableDeclaration, fromContext: Context | null = null): boolean {

		// `for (item of items)`, broadcast observed from items to item.
		if (fromContext && (fromContext.type & ContextTypeMask.IterationInitializer) > 0) {
			if (ts.isForOfStatement(this.context.node)) {
				return ObservedChecker.isObserved(this.context.node.expression, true)
			}
		}

		return ObservedChecker.isVariableDeclarationObserved(node)
	}
}
