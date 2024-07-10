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
	 * Whether be `break`, `return`, or `continue` to stop current execution flow,
	 * or be `await` or `yield` statement.
	 */
	readonly selfFlowStop: number = 0

	/** 
	 * Whether inner codes has `break`, `return`, or `continue` to stop current execution flow,
	 * or inner codes has `await` or `yield` statement.
	 */
	innerFlowStop: number = 0

	constructor(context: Context) {
		this.context = context
		this.nothingReturned = this.checkNothingReturned()

		if (ts.isReturnStatement(this.context.node)
			|| context.type === ContextType.NonBlockFunctionBody
		) {
			this.selfFlowStop |= FlowStopType.Return
		}
		
		if (ts.isBreakOrContinueStatement(this.context.node)) {
			this.selfFlowStop |= FlowStopType.BreakLike
		}
		
		if (ts.isAwaitExpression(this.context.node) || ts.isYieldExpression(this.context.node)) {
			this.selfFlowStop |= FlowStopType.YieldLike
		}

		this.innerFlowStop = this.selfFlowStop
	}

	private checkNothingReturned(): boolean {
		let node = this.context.node

		// Inherit from parent context.
		if (this.context.type !== ContextType.FunctionLike) {
			return this.context.parent?.state.nothingReturned ?? false
		}

		let type = helper.getNodeReturnType(node as TS.FunctionLikeDeclaration)
		return !!(type && (type.getFlags() & ts.TypeFlags.Void))
	}

	applyInnerReturn(value: boolean) {
		if (this.context.type === ContextType.FunctionLike) {
			return 
		}

		this.innerFlowStop |= value ? FlowStopType.Return : 0
	}

	applyInnerBreakLike(value: boolean) {
		if (this.context.type === ContextType.FunctionLike) {
			return 
		}

		// Break would not broadcast out of `iteration` and `case`.
		if (this.context.type === ContextType.IterationContent
			|| this.context.type === ContextType.ConditionalContent
				&& ts.isCaseOrDefaultClause(this.context.node)
		) {
			return 
		}

		this.innerFlowStop |= value ? FlowStopType.BreakLike : 0
	}

	applyInnerYieldLike(value: boolean) {
		if (this.context.type === ContextType.FunctionLike) {
			return 
		}

		this.innerFlowStop |= value ? FlowStopType.YieldLike : 0
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

		this.applyInnerReturn(Boolean(child.state.innerFlowStop & FlowStopType.YieldLike))
		this.applyInnerYieldLike(Boolean(child.state.innerFlowStop & FlowStopType.YieldLike))
		this.applyInnerBreakLike(Boolean(child.state.innerFlowStop & FlowStopType.YieldLike))
	}

	/** Whether break like, or return, or yield like inside. */
	isInnerFlowStop(): boolean {
		return this.innerFlowStop > 0
	}

	/** Whether break like, or return, or yield like itself. */
	isSelfFlowStop(): boolean {
		return this.selfFlowStop > 0
	}
}