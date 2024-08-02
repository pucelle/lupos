import type TS from 'typescript'
import {Context} from './context'
import {ContextTypeMask} from './context-tree'
import {FlowInterruptionTypeMask, helper, ts} from '../../base'




export class ContextState {

	readonly context: Context

	/** 
	 * Whether function has nothing returned.
	 * If a method returns nothing, we stop tracking it's property getting.
	 * Initialize from a function-like type of context, and broadcast to descendants.
	 * A generator returns an `Iterable`, so it is not nothing returned.
	 */
	readonly nothingReturned: boolean

	/** How flow inside of a context was interrupted. */
	flowInterruptionType: number = 0

	constructor(context: Context) {
		this.context = context
		this.nothingReturned = this.checkNothingReturned()
		
		if (context.type & ContextTypeMask.FlowInterruption) {
			this.flowInterruptionType = helper.pack.getFlowInterruptionType(context.node)
		}
	}

	private checkNothingReturned(): boolean {
		let node = this.context.node

		// Inherit from parent context.
		if ((this.context.type & ContextTypeMask.FunctionLike) === 0) {
			return this.context.parent?.state.nothingReturned ?? false
		}

		let type = helper.types.getReturnType(node as TS.FunctionLikeDeclaration)
		return !!(type && (type.getFlags() & ts.TypeFlags.Void))
	}

	/** Union with internal contents type. */
	unionFlowInterruptionType(type: number) {
		if (this.context.type & ContextTypeMask.FunctionLike) {
			return 
		}

		if (type & FlowInterruptionTypeMask.Return) {
			this.flowInterruptionType |= FlowInterruptionTypeMask.Return
		}

		if (type & FlowInterruptionTypeMask.BreakLike) {

			// Break would not broadcast out of `iteration` and `case`, `default`.
			if (!(this.context.type & ContextTypeMask.IterationContent
				|| this.context.type & ContextTypeMask.CaseDefaultContent
			)) {
				this.flowInterruptionType |= FlowInterruptionTypeMask.BreakLike
			}
		}

		if (type & FlowInterruptionTypeMask.YieldLike) {
			this.flowInterruptionType |= FlowInterruptionTypeMask.YieldLike
		}
	}

	/** 
	 * After a child context is visiting completed, visit it.
	 * returns whether break or return or yield.
	 */
	mergeChildContext(child: Context) {
		this.unionFlowInterruptionType(child.state.flowInterruptionType)
	}

	/** Whether break like, or return, or yield like inside. */
	isFlowInterrupted(): boolean {
		return this.flowInterruptionType > 0
	}
}