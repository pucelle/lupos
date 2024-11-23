import * as ts from 'typescript'
import {TrackingScope} from './scope'
import {TrackingScopeTypeMask} from './scope-tree'
import {FlowInterruptionTypeMask, Packer, VisitTree} from '../../core'
import {AccessNode, Helper} from '../../lupos-ts-module'


export class TrackingScopeState {

	readonly scope: TrackingScope

	/** Whether be included in a constructor function */
	readonly withinLifeFunction: boolean

	/** 
	 * Whether inside a function that has nothing returned.
	 * If a function returns nothing, we stop tracking it's property getting.
	 * Initialize from a function-like type of scope, and broadcast to descendants.
	 * A generator returns an `Iterable`, so it is not nothing returned.
	 */
	readonly stopGetTracking: boolean

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

		if (!Helper.cls.isDerivedOf(classNode, 'Component', '@pucelle/lupos.js')) {
			return false
		}

		let methodName = Helper.getText(node.name)
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
		let decorator = VisitTree.findOutwardMatch(
			this.scope.visitIndex,
			parent.visitIndex,
			ts.isDecorator
		)

		if (decorator) {
			return false
		}

		let isVoidReturning = Helper.types.isVoidReturning(node as ts.FunctionLikeDeclaration)

		// An instantly run function should inherit whether stop get tracking.
		if (this.scope.type & TrackingScopeTypeMask.InstantlyRunFunction) {
			return parent.state.stopGetTracking || isVoidReturning
		}
		else {
			return isVoidReturning
		}
	}

	private checkEffectDecorated(): boolean {
		let node = this.scope.node

		// Inherit from parent scope.
		if (!ts.isMethodDeclaration(node)) {
			return this.scope.parent?.state.effectDecorated ?? false
		}

		let decoName = Helper.deco.getFirstName(node)
		return decoName === 'effect'
	}

	/** Union with internal contents type. */
	unionFlowInterruptionType(type: FlowInterruptionTypeMask | 0) {
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

		if (type & FlowInterruptionTypeMask.YieldLike) {
			this.flowInterruptionType |= FlowInterruptionTypeMask.YieldLike
		}
	}

	/** 
	 * After a child scope is visiting completed, visit it.
	 * returns whether break or return or yield.
	 */
	mergeChildScope(child: TrackingScope) {
		this.unionFlowInterruptionType(child.state.flowInterruptionType)
	}

	/** Whether should ignore set tracking. */
	shouldIgnoreSetTracking(node: AccessNode | ts.Identifier): boolean {
		if (this.withinLifeFunction) {
			if (Helper.access.isAccess(node)
				&& Helper.isThis(node.expression)
			) {
				return true
			}
		}

		return false
	}

	/** Whether should ignore get tracking. */
	shouldIgnoreGetTracking(node: AccessNode | ts.Identifier): boolean {
		if (this.withinLifeFunction) {
			if (Helper.access.isAccess(node)
				&& Helper.isThis(node.expression)
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