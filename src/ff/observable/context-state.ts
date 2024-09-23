import type TS from 'typescript'
import {Context} from './context'
import {ContextTypeMask} from './context-tree'
import {FlowInterruptionTypeMask, Helper, ts} from '../../base'




export class ContextState {

	readonly context: Context

	/** Whether be included in a constructor function */
	readonly withinConstructor: boolean

	/** 
	 * Whether function has nothing returned.
	 * If a function returns nothing, we stop tracking it's property getting.
	 * Initialize from a function-like type of context, and broadcast to descendants.
	 * A generator returns an `Iterable`, so it is not nothing returned.
	 */
	readonly nothingReturned: boolean

	/** 
	 * Whether method has effect decorated.
	 * If a method returns nothing, but decorated by `@effect`,
	 * should also do get tracking for it.
	 */
	readonly effectDecorated: boolean

	/** How flow inside of a context was interrupted. */
	flowInterruptionType: FlowInterruptionTypeMask | 0 = 0

	constructor(context: Context) {
		this.context = context
		this.withinConstructor = this.checkWithinConstructor()
		this.nothingReturned = this.checkNothingReturned()
		this.effectDecorated = this.checkEffectDecorated()
		
		if (context.type & ContextTypeMask.FlowInterruption) {
			this.flowInterruptionType = Helper.pack.getFlowInterruptionType(context.node)
		}
	}

	private checkWithinConstructor(): boolean {
		let node = this.context.node

		// Inherit from parent context.
		if ((this.context.type & ContextTypeMask.FunctionLike) === 0) {
			return this.context.parent?.state.withinConstructor ?? false
		}

		return ts.isConstructorDeclaration(node)
	}

	private checkNothingReturned(): boolean {
		let node = this.context.node

		// Inherit from parent context.
		if ((this.context.type & ContextTypeMask.FunctionLike) === 0) {
			return this.context.parent?.state.nothingReturned ?? false
		}

		return Helper.types.isVoidReturned(node as TS.FunctionLikeDeclaration)
	}

	private checkEffectDecorated(): boolean {
		let node = this.context.node

		// Inherit from parent context.
		if (!ts.isMethodDeclaration(node)) {
			return this.context.parent?.state.effectDecorated ?? false
		}

		let decoName = Helper.deco.getFirstName(node)
		return decoName === 'effect'
	}

	/** Union with internal contents type. */
	unionFlowInterruptionType(type: FlowInterruptionTypeMask | 0) {
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

	/** Whether should ignore set tracking. */
	shouldIgnoreSetTracking(): boolean {
		if (this.withinConstructor) {
			return true
		}

		return false
	}

	/** Whether should ignore get tracking. */
	shouldIgnoreGetTracking(): boolean {
		if (this.withinConstructor) {
			return true
		}

		if (this.nothingReturned && !this.effectDecorated) {
			return true
		}

		return false
	}

	/** Whether break like, or return, or yield like inside. */
	isFlowInterrupted(): boolean {
		return this.flowInterruptionType > 0
	}
}