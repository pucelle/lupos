import type TS from 'typescript'
import {Context} from './context'
import {ContextTypeMask} from './context-tree'
import {AccessNode, FlowInterruptionTypeMask, Helper, ts, VisitTree} from '../../base'




export class ContextState {

	readonly context: Context

	/** Whether be included in a constructor function */
	readonly withinLifeFunction: boolean

	/** 
	 * Whether inside a function that has nothing returned.
	 * If a function returns nothing, we stop tracking it's property getting.
	 * Initialize from a function-like type of context, and broadcast to descendants.
	 * A generator returns an `Iterable`, so it is not nothing returned.
	 */
	readonly stopGetTracking: boolean

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
		this.withinLifeFunction = this.checkWithinLifeFunction()
		this.stopGetTracking = this.checkStopGetTracking()
		this.effectDecorated = this.checkEffectDecorated()

		if (context.type & ContextTypeMask.FlowInterruption) {
			this.flowInterruptionType = Helper.pack.getFlowInterruptionType(context.node)
		}
	}

	private checkWithinLifeFunction(): boolean {
		let node = this.context.node

		// Inherit from parent context.
		if ((this.context.type & ContextTypeMask.FunctionLike) === 0) {
			return this.context.parent?.state.withinLifeFunction ?? false
		}

		if (ts.isConstructorDeclaration(node)) {
			return true
		}

		if (!ts.isMethodDeclaration(node)) {
			return false
		}

		let classNode = node.parent
		if (!ts.isClassDeclaration(classNode)) {
			return false
		}

		if (!Helper.cls.isDerivedOf(classNode, 'Component', '@pucelle/lupos.js')) {
			return false
		}

		let methodName = Helper.getText(node.name)
		return ['onCreated', 'onConnected', 'onWillDisconnect'].includes(methodName)
	}

	private checkStopGetTracking(): boolean {
		let node = this.context.node
		let parent = this.context.parent

		if (!parent) {
			return false
		}

		// Self is not function, inherit from parent context.
		if ((this.context.type & ContextTypeMask.FunctionLike) === 0) {
			return parent.state.stopGetTracking ?? false
		}

		// If current context was included by a decorator, treat parent as global context.
		let decorator = VisitTree.findOutwardMatch(
			this.context.visitIndex,
			parent.visitIndex,
			ts.isDecorator
		)

		if (decorator) {
			return false
		}

		let isVoidReturning = Helper.types.isVoidReturning(node as TS.FunctionLikeDeclaration)

		// An arrow function or function expression inherit from parent.
		// We assume this function would be run immediately.
		if (ts.isFunctionExpression(this.context.node)
			|| ts.isArrowFunction(this.context.node)
		) {
			return parent.state.stopGetTracking || isVoidReturning
		}

		return isVoidReturning
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
	shouldIgnoreSetTracking(node: AccessNode | TS.Identifier): boolean {
		if (this.withinLifeFunction) {
			if (Helper.access.isAccess(node)
				&& node.expression.kind === ts.SyntaxKind.ThisKeyword
			) {
				return true
			}
		}

		return false
	}

	/** Whether should ignore get tracking. */
	shouldIgnoreGetTracking(node: AccessNode | TS.Identifier): boolean {
		if (this.withinLifeFunction) {
			if (Helper.access.isAccess(node)
				&& node.expression.kind === ts.SyntaxKind.ThisKeyword
			) {
				return true
			}
		}

		if (this.stopGetTracking && !this.effectDecorated) {
			return true
		}

		return false
	}

	/** Whether break like, or return, or yield like inside. */
	isFlowInterrupted(): boolean {
		return this.flowInterruptionType > 0
	}
}