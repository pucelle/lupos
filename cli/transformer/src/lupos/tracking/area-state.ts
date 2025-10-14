import * as ts from 'typescript'
import {TrackingArea} from './area'
import {TrackingAreaTree, TrackingAreaTypeMask} from './area-tree'
import {FlowInterruptionTypeMask, Packer, helper} from '../../core'


export class TrackingAreaState {

	readonly area: TrackingArea

	/** 
	 * Whether be included in a constructor function,
	 * or other methods to control life cycle.
	 */
	readonly withinLifeFunction: boolean

	/** 
	 * Whether inside a function that has nothing returned.
	 * If a function returns nothing, we stop tracking it's property getting.
	 * Initialize from a function-like type of area, and broadcast to descendants.
	 * A generator returns an `Iterable`, so it is not nothing returned.
	 */
	readonly stopGetTracking: boolean

	/** 
	 * If a function like area has any tracking code,
	 * stop any tracking.
	 */
	readonly stopAnyTracking: boolean

	/** 
	 * Whether method has effect decorated.
	 * If a method returns nothing, but decorated by `@effect`,
	 * should also do get tracking for it.
	 */
	readonly effectDecorated: boolean

	/** How flow inside of a area was interrupted. */
	flowInterruptionType: FlowInterruptionTypeMask | 0 = 0

	constructor(area: TrackingArea) {
		this.area = area
		this.withinLifeFunction = this.checkWithinLifeFunction()
		this.stopGetTracking = this.checkStopGetTracking()
		this.stopAnyTracking = this.checkStopAnyTracking()
		this.effectDecorated = this.checkEffectDecorated()

		if (area.type & TrackingAreaTypeMask.FlowInterruption) {
			this.flowInterruptionType = Packer.getFlowInterruptionType(area.node)
		}
	}

	private checkWithinLifeFunction(): boolean {
		let node = this.area.node

		// Inherit from parent area.
		if ((this.area.type & TrackingAreaTypeMask.FunctionLike) === 0) {
			return this.area.parent?.state.withinLifeFunction ?? false
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

		if (!helper.objectLike.isDerivedOf(classNode, 'Component', '@pucelle/lupos.js')) {
			return false
		}

		let methodName = helper.getText(node.name)
		return ['onCreated', 'onConnected', 'onWillDisconnect'].includes(methodName)
	}

	private checkStopGetTracking(): boolean {
		let node = this.area.node
		let parent = this.area.parent

		if (!parent) {
			return false
		}

		// Self is not function, inherit from parent area.
		if ((this.area.type & TrackingAreaTypeMask.FunctionLike) === 0) {
			return parent.state.stopGetTracking ?? false
		}

		// If current area was included by a decorator, treat parent as global area.
		let decorator = helper.findOutwardUntil(
			this.area.node,
			parent.node,
			ts.isDecorator
		)

		if (decorator) {
			return false
		}

		let isVoidReturning = helper.isVoidReturning(node as ts.FunctionLikeDeclaration)

		// An instantly run function should inherit whether stop get tracking.
		if (this.area.type & TrackingAreaTypeMask.InstantlyRunFunction) {
			return parent.state.stopGetTracking || isVoidReturning
		}
		else {
			return isVoidReturning
		}
	}

	private checkStopAnyTracking() {
		let node = this.area.node
		let parent = this.area.parent

		if (!parent) {
			return false
		}

		// Self is not function, inherit from parent area.
		if ((this.area.type & TrackingAreaTypeMask.FunctionLike) === 0) {
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
		let node = this.area.node

		// Inherit from parent area.
		if (!ts.isMethodDeclaration(node)) {
			return this.area.parent?.state.effectDecorated ?? false
		}

		let decoName = helper.deco.getFirstName(node)
		return decoName === 'effect'
	}

	/** Union with internal contents type. */
	unionFlowInterruptionType(type: FlowInterruptionTypeMask | 0) {

		// Union never cross function declaration.
		if (this.area.type & TrackingAreaTypeMask.FunctionLike) {
			return 
		}

		if (type & FlowInterruptionTypeMask.Return) {
			this.flowInterruptionType |= FlowInterruptionTypeMask.Return
		}

		if (type & FlowInterruptionTypeMask.BreakLike) {

			// Break would not broadcast out of `iteration` and `case`, `default`.
			if (!(
				this.area.type & TrackingAreaTypeMask.IterationContent
				|| this.area.type & TrackingAreaTypeMask.CaseDefaultContent
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
				&& TrackingAreaTree.mayRunOrNot(this.area.type)
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
	 * After a child area is visiting completed, visit it.
	 * returns whether break or return or yield.
	 */
	mergeChildArea(child: TrackingArea) {
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