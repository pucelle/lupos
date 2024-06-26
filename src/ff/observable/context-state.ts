import type TS from 'typescript'
import {Context} from './context'
import {checker} from './checker'
import {ClassRange} from './class-range'
import {ContextType} from './context-tree'
import {helper, ts} from '../../base'


export class ContextState {

	readonly context: Context
	
	/** Context type. */
	readonly type: ContextType

	/** 
	 * Whether `this` is observed.
	 * Only available for function-like type of context.
	 */
	readonly thisObserved: boolean

	/** 
	 * Whether function has nothing returned.
	 * If a method returns nothing, and changes no outer variable or parameters,
	 * we mark it has no side effects, and stop tracking it.
	 * Only available for function-like type of context.
	 */
	readonly nothingReturned: boolean

	/** 
	 * Whether inner codes has `break`, or `continue` to stop current execution flow.
	 * If would break inside, end collected tracking expressions before it.
	 * Broadcast it to parent until closest iteration or switch context.
	 */
	breakInside: boolean = false

	/** 
	 * Whether inner codes has return statement to return before execution to end.
	 * Broadcast it to parent until closest function like context.
	 */
	returnInside: boolean = false

	constructor(type: ContextType, context: Context) {
		this.type = type
		this.context = context

		this.thisObserved = this.checkThisObserved()
		this.nothingReturned = this.checkNothingReturned()
	}

	private checkThisObserved(): boolean {
		let node = this.context.node

		// Inherit from parent context.
		if (this.type !== ContextType.FunctionLike) {
			return this.context.parent?.state.thisObserved ?? false
		}

		let thisParameter = (node as TS.FunctionLikeDeclaration).parameters.find(param => {
			return ts.isIdentifier(param.name) && param.name.text === 'this'
		})

		// If declared `this` parameter.
		if (thisParameter && thisParameter.type) {

			// Directly declare type as `Observed<>`.
			let typeNode = thisParameter.type
			if (checker.isTypeNodeObserved(typeNode)) {
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

	private checkNothingReturned(): boolean {
		let node = this.context.node

		// Inherit from parent context.
		if (this.type !== ContextType.FunctionLike) {
			return this.context.parent?.state.nothingReturned ?? false
		}

		let type = helper.getNodeReturnType(node as TS.FunctionLikeDeclaration)
		return !!(type && (type.getFlags() & ts.TypeFlags.Void))
	}

	/** Initialize after all children contexts created. */
	postInit() {
		this.breakInside = this.checkBreakInside()
		this.returnInside = this.checkReturnInside()
	}

	private checkBreakInside() {
		return this.context.children.some(child => {
			if (child.state.type === ContextType.Iteration || child.state.type === ContextType.CaseContent) {
				return false
			}
			else if (ts.isBreakStatement(child.node) || ts.isContinueStatement(child.node)) {
				return true
			}
			else {
				return child.state.breakInside
			}
		})
	}

	private checkReturnInside() {
		return this.context.children.some(child => {
			if (child.state.type === ContextType.FunctionLike) {
				return false
			}
			else if (ts.isReturnStatement(child.node)) {
				return true
			}
			else {
				return child.state.returnInside
			}
		})
	}
}