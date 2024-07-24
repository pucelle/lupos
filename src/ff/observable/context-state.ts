import type TS from 'typescript'
import {Context} from './context'
import {ContextType} from './context-tree'
import {helper, ts} from '../../base'


/** How the flow was interrupted. */
export enum FlowInterruptedByType {
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
	 * A generator returns an `Iterable`, so it is not nothing returned.
	 */
	readonly nothingReturned: boolean

	/** 
	 * Whether inner codes has `break`, `return`, or `continue` to stop current execution flow,
	 * or inner codes has `await` or `yield` statement.
	 */
	flowInterruptedBy: number = 0

	constructor(context: Context) {
		this.context = context
		this.nothingReturned = this.checkNothingReturned()

		let flowInterrupted = 0

		if (ts.isReturnStatement(this.context.node)) {
			flowInterrupted |= FlowInterruptedByType.Return
		}
		
		if (ts.isBreakOrContinueStatement(this.context.node)) {
			flowInterrupted |= FlowInterruptedByType.BreakLike
		}
		
		if (ts.isAwaitExpression(this.context.node) || ts.isYieldExpression(this.context.node)) {
			flowInterrupted |= FlowInterruptedByType.YieldLike
		}

		this.flowInterruptedBy = flowInterrupted
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

		this.flowInterruptedBy |= value ? FlowInterruptedByType.Return : 0
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

		this.flowInterruptedBy |= value ? FlowInterruptedByType.BreakLike : 0
	}

	applyInnerYieldLike(value: boolean) {
		if (this.context.type === ContextType.FunctionLike) {
			return 
		}

		this.flowInterruptedBy |= value ? FlowInterruptedByType.YieldLike : 0
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

		this.applyInnerReturn(Boolean(child.state.flowInterruptedBy & FlowInterruptedByType.Return))
		this.applyInnerBreakLike(Boolean(child.state.flowInterruptedBy & FlowInterruptedByType.BreakLike))
		this.applyInnerYieldLike(Boolean(child.state.flowInterruptedBy & FlowInterruptedByType.YieldLike))
	}

	/** Whether break like, or return, or yield like inside. */
	isFlowInterrupted(): boolean {
		return this.flowInterruptedBy > 0
	}
}