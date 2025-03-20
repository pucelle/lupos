import * as ts from 'typescript'
import {TrackingScope} from './scope'
import {TrackingScopeTree, TrackingScopeTypeMask} from './scope-tree'
import {FlowInterruptionTypeMask, Packer, helper} from '../../core'


export class TrackingScopeState {

	readonly scope: TrackingScope

	/** 
	 * Whether be included in a constructor function,
	 * or other methods to control life cycle.
	 */
	readonly withinLifeFunction: boolean

	/** 
	 * Whether inside a function that has nothing returned.
	 * If a function returns nothing, we stop tracking it's property getting.
	 * Initialize from a function-like type of scope, and broadcast to descendants.
	 * A generator returns an `Iterable`, so it is not nothing returned.
	 */
	readonly stopGetTracking: boolean

	/** 
	 * If a function like scope has any tracking code,
	 * stop any tracking.
	 */
	readonly stopAnyTracking: boolean

	/** 
	 * Whether method has effect decorated.
	 * If a method returns nothing, but decorated by `@effect`,
	 * should also do get tracking for it.
	 */
	readonly effectDecorated: boolean

	/** How flow inside of a scope was interrupted. */
	flowInterruptionType: FlowInterruptionTypeMask | 0 = 0

	constructor(scope: TrackingScope) {
		this.scope = scope
		this.withinLifeFunction = this.checkWithinLifeFunction()
		this.stopGetTracking = this.checkStopGetTracking()
		this.stopAnyTracking = this.checkStopAnyTracking()
		this.effectDecorated = this.checkEffectDecorated()

		if (scope.type & TrackingScopeTypeMask.FlowInterruption) {
			this.flowInterruptionType = Packer.getFlowInterruptionType(scope.node)
		}
	}

	private checkWithinLifeFunction(): boolean {
		let node = this.scope.node

		// Inherit from parent scope.
		if ((this.scope.type & TrackingScopeTypeMask.FunctionLike) === 0) {
			return this.scope.parent?.state.withinLifeFunction ?? false
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

		if (!helper.class.isDerivedOf(classNode, 'Component', '@pucelle/lupos.js')) {
			return false
		}

		let methodName = helper.getText(node.name)
		return ['onCreated', 'onConnected', 'onWillDisconnect'].includes(methodName)
	}

	private checkStopGetTracking(): boolean {
		let node = this.scope.node
		let parent = this.scope.parent

		if (!parent) {
			return false
		}

		// Self is not function, inherit from parent scope.
		if ((this.scope.type & TrackingScopeTypeMask.FunctionLike) === 0) {
			return parent.state.stopGetTracking ?? false
		}

		// If current scope was included by a decorator, treat parent as global scope.
		let decorator = helper.findOutwardUntil(
			this.scope.node,
			parent.node,
			ts.isDecorator
		)

		if (decorator) {
			return false
		}

		let isVoidReturning = helper.isVoidReturning(node as ts.FunctionLikeDeclaration)

		// An instantly run function should inherit whether stop get tracking.
		if (this.scope.type & TrackingScopeTypeMask.InstantlyRunFunction) {
			return parent.state.stopGetTracking || isVoidReturning
		}
		else {
			return isVoidReturning
		}
	}

	private checkStopAnyTracking() {
		let node = this.scope.node
		let parent = this.scope.parent

		if (!parent) {
			return false
		}

		// Self is not function, inherit from parent scope.
		if ((this.scope.type & TrackingScopeTypeMask.FunctionLike) === 0) {
			return parent.state.stopAnyTracking ?? false
		}

		for (let descendant of helper.walkInward(node)) {
			if (!ts.isCallExpression(descendant)) {
				continue
			}

			// Should have no need to test whether import from `@pucelle/ff`.
			let fnName = helper.getFullText(descendant.expression)
			if (fnName === 'trackGet'
				|| fnName === 'trackGetDeeply'
				|| fnName === 'trackSet'
			) {
				return true
			}
		}

		return false
	}

	private checkEffectDecorated(): boolean {
		let node = this.scope.node

		// Inherit from parent scope.
		if (!ts.isMethodDeclaration(node)) {
			return this.scope.parent?.state.effectDecorated ?? false
		}

		let decoName = helper.deco.getFirstName(node)
		return decoName === 'effect'
	}

	/** Union with internal contents type. */
	unionFlowInterruptionType(type: FlowInterruptionTypeMask | 0) {

		// Union never cross function declaration.
		if (this.scope.type & TrackingScopeTypeMask.FunctionLike) {
			return 
		}

		if (type & FlowInterruptionTypeMask.Return) {
			this.flowInterruptionType |= FlowInterruptionTypeMask.Return
		}

		if (type & FlowInterruptionTypeMask.BreakLike) {

			// Break would not broadcast out of `iteration` and `case`, `default`.
			if (!(
				this.scope.type & TrackingScopeTypeMask.IterationContent
				|| this.scope.type & TrackingScopeTypeMask.CaseDefaultContent
			)) {
				this.flowInterruptionType |= FlowInterruptionTypeMask.BreakLike
			}
		}

		if (type & FlowInterruptionTypeMask.Yield) {
			this.flowInterruptionType |= FlowInterruptionTypeMask.Yield
		}

		if (type & FlowInterruptionTypeMask.Await) {
			
			// `if (...) await ...`
			if ((type & FlowInterruptionTypeMask.Await)
				&& TrackingScopeTree.mayRunOrNot(this.scope.type)
			) {
				this.flowInterruptionType |= FlowInterruptionTypeMask.ConditionalAwait
			}
			else {
				this.flowInterruptionType |= FlowInterruptionTypeMask.Await
			}
		}

		if (type & FlowInterruptionTypeMask.ConditionalAwait) {
			this.flowInterruptionType |= FlowInterruptionTypeMask.ConditionalAwait
		}
	}

	/** 
	 * After a child scope is visiting completed, visit it.
	 * returns whether break or return or yield.
	 */
	mergeChildScope(child: TrackingScope) {
		this.unionFlowInterruptionType(child.state.flowInterruptionType)
	}

	/** Whether should ignore get tracking. */
	shouldIgnoreGetTracking(): boolean {
		if (this.stopAnyTracking) {
			return true
		}

		if (this.withinLifeFunction) {
			return true
		}

		if (this.stopGetTracking && !this.effectDecorated) {
			return true
		}

		return false
	}

	/** Whether should ignore set tracking. */
	shouldIgnoreSetTracking(node: ts.Expression): boolean {
		if (this.stopAnyTracking) {
			return true
		}

		if (this.withinLifeFunction) {
			if (helper.access.isAccess(node)
				&& helper.isThis(node.expression)
			) {
				return true
			}
		}

		return false
	}

	/** Whether break like, or return, or yield like inside. */
	isFlowInterrupted(): boolean {
		return this.flowInterruptionType > 0
	}
}