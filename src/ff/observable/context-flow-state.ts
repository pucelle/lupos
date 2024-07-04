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

		this.applyReturn(ts.isReturnStatement(this.context.node))
		this.applyYield(ts.isAwaitExpression(this.context.node) || ts.isYieldExpression(this.context.node))
		this.applyBreak(ts.isBreakOrContinueStatement(this.context.node))
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

	/** Apply `returnInside` value. */
	applyReturn(value: boolean) {
		if (this.context.type === ContextType.FunctionLike) {
			return 
		}

		this.returnInside ||= value
	}

	/** Apply `yieldInside` value. */
	applyYield(value: boolean) {
		if (this.context.type === ContextType.FunctionLike) {
			return 
		}

		this.yieldInside ||= value
	}

	/** Apply `breakInside` value. */
	applyBreak(value: boolean) {
		if (this.context.type === ContextType.FunctionLike) {
			return 
		}

		this.breakInside ||= value
	}

	/** 
	 * After a child context is visiting completed, visit it.
	 * returns whether break or return or yield.
	 */
	mergeChildContext(child: Context) {

		// Never broadcast out of function.
		if (child.type === ContextType.FunctionLike) {
			return
		}

		this.applyReturn(child.flowState.returnInside)
		this.applyYield(child.flowState.yieldInside)

		// Break would not broadcast out of iteration and case default.
		this.applyBreak(child.flowState.breakInside
			&& child.type !== ContextType.Iteration
			&& child.type !== ContextType.CaseContent)
	}

	/** Whether break like, or return, or yield like inside. */
	isBreakLikeInside(): boolean {
		return this.returnInside || this.yieldInside || this.breakInside
	}
}