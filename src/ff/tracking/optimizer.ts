import type TS from 'typescript'
import {Helper, Modifier, ts} from '../../core'
import {TrackingScope} from './scope'
import {TrackingScopeTree, TrackingScopeTypeMask} from './scope-tree'
import {TrackingCapturerOperator} from './capturer-operator'


/**
 * 0. Should find a way to hash access expression.
 * 1. If parent scope has a captured, child scopes should eliminate it.
 * 2. If all conditional scopes have same captured, move it higher.
 * 3. Try to move captured from iteration scope higher.
 * 4. If previous captured has a captured, should eliminate it from following captured.
 */
export namespace Optimizer {

	/** 
	 * Optimize each scope before it will exit.
	 * All child scopes must have been optimized.
	 */
	export function optimize(scope: TrackingScope) {

		// `return a.b` -> `track(a.b); return ...`
		if (scope.type & TrackingScopeTypeMask.FlowInterruption) {
			moveFlowInterruptionCapturedOutward(scope)
		}

		// `if (...) {a.b} else {a.b}` -> `track(a.b); if ...`
		if (scope.type & TrackingScopeTypeMask.Conditional) {
			mergeConditionalContentCapturedBranches(scope)
		}

		// `if (a.b) ...`-> `track(a.b); if ...`
		if (scope.type & TrackingScopeTypeMask.ConditionalCondition
			|| scope.type & TrackingScopeTypeMask.SwitchCondition
		) {
			moveAnyConditionCapturedOutward(scope)
		}

		// `case a.b: ... case a.b + 1: ...` -> `track(a.b); ...`
		// `if (a.b) ...`-> `track(a.b); if ...`
		if (scope.type & TrackingScopeTypeMask.Switch) {
			moveCaseConditionCapturedBranchesOutward(scope)
			mergeCaseContentCapturedBranches(scope)
		}

		// `for(let c = a.b;)` -> `track(a.b); for ...`.
		if (scope.type & TrackingScopeTypeMask.IterationInitializer) {
			moveIterationInitializerCapturedOutward(scope)
		}

		// `for (let c = 0; c < a.b; )` -> `track(a.b); for...`
		// `for (let a = xx; a.b; )` -> `for (...) {track(a.b); ...}`
		if (scope.type & TrackingScopeTypeMask.IterationCondition
			|| scope.type & TrackingScopeTypeMask.IterationIncreasement
			|| scope.type & TrackingScopeTypeMask.IterationExpression
		) {
			moveIterationConditionIncreasementExpressionOutward(scope)
			moveIterationConditionIncreasementExpressionToIteration(scope)
		}

		// This optimizing has low risk, loop codes may not run when have no looping.
		// `for (...) {a.b}` -> `track(a.b); for ...
		if (scope.type & TrackingScopeTypeMask.IterationContent) {
			moveIterationContentCapturedOutward(scope)
		}

		// This optimizing has low risk, array methods may not run when have no items.
		// `[].map(i => {i + a.b})` -> `track(a.b); [].map...`
		if (scope.type & TrackingScopeTypeMask.InstantlyRunFunction) {
			moveInstantlyRunFunctionCapturedOutward(scope)
		}

		// Eliminate repetitive.
		// `track(a.b); if (...) {track(a.b)}` -> `track(a.b); if (...) {}`
		if (scope.type & TrackingScopeTypeMask.FunctionLike) {
			eliminateRepetitiveCapturedRecursively(scope)
		}

		// Eliminate private and don't have both get and set capture types.
		// `class {private prop}`, has only `prop` getting, or only setting -> remove it.
		if (scope.type & TrackingScopeTypeMask.Class) {
			eliminatePrivateUniqueTrackingType(scope)
		}
	}


	/** 
	 * Move flow interruption captured outward.
	 * `return a.b` -> `track(a.b); return ...`
	 */
	function moveFlowInterruptionCapturedOutward(scope: TrackingScope) {
		if (!scope.capturer.hasCaptured()) {
			return
		}

		// Can't across conditional content.
		if (scope.type & TrackingScopeTypeMask.ConditionalContent) {
			return
		}

		// parent of flow interruption.
		let targetScope = scope.parent!

		scope.capturer.operator.safelyMoveCapturedOutwardTo(targetScope.capturer)
	}


	/** 
	 * Move condition of conditional or switch captured outward.
	 * `if (a.b) ...`-> `track(a.b); if ...`
	 * `switch (a.b) ...`-> `track(a.b); switch ...`
	 */
	function moveAnyConditionCapturedOutward(scope: TrackingScope) {
		if (!scope.capturer.hasCaptured()) {
			return
		}

		// `a && b && c`, ancestor's types of `a`:
		// ConditionalCondition =>
		// Conditional & ConditionalCondition =>
		// Conditional

		// Look for the end of `ConditionalCondition` chain.
		let conditionScope = scope
		while (conditionScope.parent!.type & TrackingScopeTypeMask.ConditionalCondition) {
			conditionScope = conditionScope.parent!
		}

		// parent of conditional or switch.
		let targetScope = conditionScope.parent!.parent!

		// Can't across `ConditionalContent`, so move to Conditional.
		if (conditionScope.parent!.type & TrackingScopeTypeMask.ConditionalContent) {
			targetScope = conditionScope.parent!
		}

		scope.capturer.operator.safelyMoveCapturedOutwardTo(targetScope.capturer)
	}


	/** 
	 * Merge all branches captured and move outward.
	 * `if (...) {a.b} else {a.b}` -> `track(a.b); if ...`
	 */
	function mergeConditionalContentCapturedBranches(scope: TrackingScope) {
		let contentChildren = scope.children.filter(child => {
			return child.type & TrackingScopeTypeMask.ConditionalContent
		})

		// Must have both two branches.
		let canMerge = contentChildren.length >= 2
		if (!canMerge) {
			return
		}

		let capturers = contentChildren.map(c => c.capturer)
		let shared = TrackingCapturerOperator.intersectCapturedItems(capturers)

		if (shared.length === 0) {
			return
		}

		// parent of conditional or switch.
		let targetScope = scope.parent!

		// Can't across `ConditionalContent`, move to Conditional.
		if (scope.type & TrackingScopeTypeMask.ConditionalContent) {
			targetScope = scope
		}

		targetScope.capturer.operator.safelyMoveSomeCapturedOutwardFrom(shared, contentChildren[0].capturer)
	}


	/** 
	 * Move all case condition captured and move outward.
	 * `case a.b: ... case a.c: ...` -> `track(a.b, a.c); ...`
	 */
	function moveCaseConditionCapturedBranchesOutward(scope: TrackingScope) {
		let caseConditionChildren = scope.children.map(child => child.children).flat().filter(child => {
			return child.type & TrackingScopeTypeMask.CaseCondition
		})

		let capturers = caseConditionChildren.map(c => c.capturer)
		let targetScope = scope.parent!

		for (let capturer of capturers) {
			capturer.operator.safelyMoveCapturedOutwardTo(targetScope.capturer)
		}
	}


	/** 
	 * Merge all case content captured and move outward.
	 * `case xxx: a.b; case xxx: a.b` -> `track(a.b); ...`
	 */
	function mergeCaseContentCapturedBranches(scope: TrackingScope) {
		let caseContentChildren = scope.children.map(child => child.children).flat().filter(child => {
			return child.type & TrackingScopeTypeMask.CaseDefaultContent
		})

		let capturers = caseContentChildren.map(c => c.capturer)
		let shared = TrackingCapturerOperator.intersectCapturedItems(capturers)

		if (shared.length === 0) {
			return
		}

		let targetScope = scope.parent!
		targetScope.capturer.operator.safelyMoveSomeCapturedOutwardFrom(shared, caseContentChildren[0].capturer)
	}


	/** 
	 * Move whole content of iteration initializer outward.
	 * `for(let c = a.b;)` -> `track(a.b); for ...`.
	 */
	function moveIterationInitializerCapturedOutward(scope: TrackingScope) {
		if (!scope.capturer.hasCaptured()) {
			return
		}

		let toPosition = TrackingScopeTree.findClosestPositionToAddStatements(
			scope.visitIndex, scope
		)

		Modifier.moveOnce(scope.visitIndex, toPosition.index)
		scope.capturer.operator.safelyMoveCapturedOutwardTo(toPosition.scope.capturer)
	}


	/** Move iteration condition or increasement or expression captured outward. */
	function moveIterationConditionIncreasementExpressionOutward(scope: TrackingScope) {
		if (!scope.capturer.hasCaptured()) {
			return
		}

		// parent of iteration.
		let targetScope = scope.parent!.parent!

		scope.capturer.operator.safelyMoveCapturedOutwardTo(targetScope.capturer)
	}


	/** 
	 * Move iteration condition or increasement or expression captured inward to iteration content.
	 * `for (let a = xx; a.b; )` -> `for (...) {track(a.b); ...}`
	 */
	function moveIterationConditionIncreasementExpressionToIteration(scope: TrackingScope) {
		if (!scope.capturer.hasCaptured()) {
			return
		}

		// iteration content.
		let targetScope = scope.parent!.children.find(c => c.type & TrackingScopeTypeMask.IterationContent)
		if (targetScope) {
			scope.capturer.operator.moveCapturedBackwardTo(targetScope.capturer)
		}
	}


	/** 
	 * Move iteration captured outward.
	 * `for (...) {a.b}` -> `track(a.b); for ...`
	 */
	function moveIterationContentCapturedOutward(scope: TrackingScope) {
		if (!scope.capturer.hasCaptured()) {
			return
		}

		// parent of iteration.
		let targetScope = scope.parent!.parent!

		scope.capturer.operator.safelyMoveCapturedOutwardTo(targetScope.capturer)
	}


	/** 
	 * Move instantly run function like array methods captured outward.
	 * `[].map(i => {i + a.b})` -> `track(a.b); [].map...`
	 */
	function moveInstantlyRunFunctionCapturedOutward(scope: TrackingScope) {
		if (!scope.capturer.hasCaptured()) {
			return
		}

		// parent of array method.
		let targetScope = scope.parent!

		scope.capturer.operator.safelyMoveCapturedOutwardTo(targetScope.capturer)
	}


	/** 
	 * Eliminate repetitive captured indices that repeat itself or with it's descendants.
	 * `track(a.b); if (...) {track(a.b)}` -> `track(a.b); if (...) {}`
	 */
	function eliminateRepetitiveCapturedRecursively(scope: TrackingScope) {
		scope.capturer.operator.eliminateRepetitiveRecursively(new Set())
	}


	/** 
	 * Eliminate private and don't have both get and set capture types.
	 * `class {private prop}`, has only `prop` getting, or only setting -> remove it.
	 */
	function eliminatePrivateUniqueTrackingType(scope: TrackingScope) {
		enum TypeMask {
			Get = 1,
			Set = 2,
		}

		let classNode = scope.node as TS.ClassLikeDeclaration
		let nameMap: Map<string, {indices: number[], typeMask: TypeMask | 0}> = new Map()


		// Group captured by property name.
		for (let {name, index, type} of scope.capturer.operator.walkPrivateCaptured(classNode)) {
			let item = nameMap.get(name)
			if (!item) {
				item = {
					indices: [],
					typeMask: 0,
				}

				nameMap.set(name, item)
			}
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   
			item.indices.push(index)
			item.typeMask |= (type === 'get' ? TypeMask.Get : TypeMask.Set)
		}


		// Visit all private computed, treat it as set type.
		for (let member of classNode.members) {
			if (!ts.isGetAccessorDeclaration(member)) {
				continue
			}

			let name = Helper.getText(member.name)
			let nameMapItem = nameMap.get(name)
			if (!nameMapItem) {
				continue
			}

			let decorators = Helper.deco.getDecorators(member)
			let computed = decorators.find(deco => Helper.deco.getName(deco) === 'computed')
			if (!computed) {
				continue
			}

			nameMapItem.typeMask |= TypeMask.Set
		}


		// Generate indices that should be removed.
		let removeIndices: Set<number> = new Set()

		for (let {indices, typeMask} of nameMap.values()) {
			if (typeMask === (TypeMask.Get | TypeMask.Set)) {
				continue
			}

			for (let index of indices) {
				removeIndices.add(index)
			}
		}

		scope.capturer.operator.removeCapturedIndicesRecursively(removeIndices)
	}
}