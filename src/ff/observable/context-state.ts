import type TS from 'typescript'
import {Context} from './context'
import {ContextType} from './context-tree'
import {helper, ts} from '../../base'


enum FlowStopType {
	Return = 1,
	BreakLike = 2,
	YieldLike = 4,
}


export class ContextState {

	readonly context: Context

	/** 
	 * Whether function has nothing returned.
	 * If a method returns nothing, we stop tracking it's property getting.
	 * Initialize from a function-like type of context, and broadcast to descendants.
	 */
	readonly nothingReturned: boolean

	/** 
	 * Whether inner codes has `break`, `return`, or `continue` to stop current execution flow,
	 * or inner codes has `await` or `yield` statement.
	 */
	flowInterrupted: number = 0

	constructor(context: Context) {
		this.context = context
		this.nothingReturned = this.checkNothingReturned()

		let flowInterrupted = 0

		if (ts.isReturnStatement(this.context.node)) {
			flowInterrupted |= FlowStopType.Return
		}
		
		if (ts.isBreakOrContinueStatement(this.context.node)) {
			flowInterrupted |= FlowStopType.BreakLike
		}
		
		if (ts.isAwaitExpression(this.context.node) || ts.isYieldExpression(this.context.node)) {
			flowInterrupted |= FlowStopType.YieldLike
		}

		this.flowInterrupted = flowInterrupted
	}

	private checkNothingReturned(): boolean {
		let node = this.context.node

		// Inherit from parent context.
		if (this.context.type !== ContextType.FunctionLike) {
			return this.context.parent?.state.nothingReturned ?? false
		}

		let type = helper.types.getReturnType(node as TS.FunctionLikeDeclaration)
		return !!(type && (type.getFlags() & ts.TypeFlags.Void))
	}

	applyInnerReturn(value: boolean) {
		if (this.context.type === ContextType.FunctionLike) {
			return 
		}

		this.flowInterrupted |= value ? FlowStopType.Return : 0
	}

	applyInnerBreakLike(value: boolean) {
		if (this.context.type === ContextType.FunctionLike) {
			return 
		}

		// Break would not broadcast out of `iteration` and `case`.
		if (this.context.type === ContextType.IterationContent
			|| ts.isCaseOrDefaultClause(this.context.node)
		) {
			return
		}

		this.flowInterrupted |= value ? FlowStopType.BreakLike : 0
	}

	applyInnerYieldLike(value: boolean) {
		if (this.context.type === ContextType.FunctionLike) {
			return 
		}

		this.flowInterrupted |= value ? FlowStopType.YieldLike : 0
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

		this.applyInnerReturn(Boolean(child.state.flowInterrupted & FlowStopType.Return))
		this.applyInnerBreakLike(Boolean(child.state.flowInterrupted & FlowStopType.BreakLike))
		this.applyInnerYieldLike(Boolean(child.state.flowInterrupted & FlowStopType.YieldLike))
	}

	/** Whether break like, or return, or yield like inside. */
	isFlowInterrupted(): boolean {
		return this.flowInterrupted > 0
	}
}