import type TS from 'typescript'
import {Context} from './context'
import {ContextType} from './context-tree'
import {helper, ts} from '../../base'


export class ContextFlowState {

	readonly context: Context

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
	 * Whether inner codes has `return` statement to return before execution to end.
	 * Broadcast it to parent until function.
	 */
	returnInside: boolean = false

	/** 
	 * Whether has `await` or `yield` statement.
	 * Broadcast it to parent until function.
	 */
	yieldInside: boolean = false

	constructor(context: Context) {
		this.context = context
		this.nothingReturned = this.checkNothingReturned()
	}

	private checkNothingReturned(): boolean {
		let node = this.context.node

		// Inherit from parent context.
		if (this.context.type !== ContextType.FunctionLike) {
			return this.context.parent?.flowState.nothingReturned ?? true
		}

		let type = helper.getNodeReturnType(node as TS.FunctionLikeDeclaration)
		return !!(type && (type.getFlags() & ts.TypeFlags.Void))
	}

	/** 
	 * After a child context is visiting completed, visit it.
	 * returns whether break or return or yield.
	 */
	mergeChildContext(child: Context): boolean {
		if (child.type === ContextType.FunctionLike) {
			return false
		}

		// Return would not broadcast out of function.
		if (child.flowState.returnInside) {
			return this.returnInside = true
		}

		// Yield would not broadcast out of function.
		if (child.flowState.yieldInside) {
			return this.yieldInside = true
		}

		// Break would not broadcast out of iteration and case default.
		if (child.flowState.breakInside
			&& child.type !== ContextType.Iteration
			&& child.type !== ContextType.CaseContent
		) {
			return this.breakInside = true
		}
		
		return false
	}
}