import type TS from 'typescript'
import {Helper, Modifier, ts} from '../../core'
import {Context} from './context'
import {ContextTree, ContextTypeMask} from './context-tree'
import {ContextCapturerOperator} from './context-capturer-operator'


/**
 * 0. Should find a way to hash access expression.
 * 1. If parent context has a tracking, child contexts should eliminate it.
 * 2. If all conditional contexts have same tracking, move it higher.
 * 3. Try to move tracking from iteration context higher.
 * 4. If previous captured has a tracking, should eliminate it from following captured.
 */
export namespace Optimizer {

	/** 
	 * Optimize each context before it will exit.
	 * All child contexts must have been optimized.
	 */
	export function optimize(context: Context) {

		// `return a.b` -> `track(a.b); return ...`
		if (context.type & ContextTypeMask.FlowInterruption) {
			moveFlowInterruptionCapturedOutward(context)
		}

		// `if (...) {a.b} else {a.b}` -> `track(a.b), if ...`
		// `if (a.b) ...`-> `track(a.b), if ...`
		if (context.type & ContextTypeMask.Conditional) {
			mergeConditionalContentCapturedBranches(context)

			// `if (A) {B} else {C}`
			// B & C can merge to outer.

			// `if (A) {B} else if (C) {D} else {E}`
			// D & E can merge to outer to before `if (C)`, but can't move outer again.

			if ((context.type & ContextTypeMask.ConditionalContent) === 0) {
				moveConditionalOrSwitchCapturedOutward(context)
			}
		}

		// `case a.b: ... case a.b + 1: ...` -> `track(a.b); ...`
		// `if (a.b) ...`-> `track(a.b), if ...`
		if (context.type & ContextTypeMask.Switch) {
			mergeCaseConditionCapturedBranches(context)
			mergeCaseContentCapturedBranches(context)
			moveConditionalOrSwitchCapturedOutward(context)
		}

		// `for(let c = a.b;)` -> `track(a.b); for ...`.
		if (context.type & ContextTypeMask.IterationInitializer) {
			moveIterationInitializerCapturedOutward(context)
		}

		// `for (let c = 0; c < a.b; )` -> `track(a.b); for...`
		// `for (let a = xx; a.b; )` -> `for (...) {track(a.b); ...}`
		if (context.type & ContextTypeMask.IterationCondition
			|| context.type & ContextTypeMask.IterationIncreasement
			|| context.type & ContextTypeMask.IterationExpression
		) {
			moveIterationConditionIncreasementExpressionOutward(context)
			moveIterationConditionIncreasementExpressionToIteration(context)
		}

		// This optimizing has low risk, loop codes may not run when have no looping.
		// `for (...) {a.b}` -> `track(a.b); for ...
		if (context.type & ContextTypeMask.IterationContent) {
			moveIterationContentCapturedOutward(context)
		}

		// This optimizing has low risk, array methods may not run when have no items.
		// `[].map(i => {i + a.b})` -> `track(a.b); [].map...`
		if (context.type & ContextTypeMask.InstantlyRunFunction) {
			moveInstantlyRunFunctionCapturedOutward(context)
		}

		// Eliminate repetitive.
		// `track(a.b); if (...) {track(a.b)}` -> `track(a.b); if (...) {}`
		if (context.type & ContextTypeMask.FunctionLike) {
			eliminateRepetitiveCapturedRecursively(context)
		}

		// Eliminate private and don't have both get and set tracking types.
		// `class {private prop}`, has only `prop` getting, or only setting -> remove it.
		if (context.type & ContextTypeMask.Class) {
			eliminatePrivateUniqueTrackingType(context)
		}
	}


	/** 
	 * Move flow interruption tracking outward.
	 * `return a.b` -> `track(a.b); return ...`
	 */
	function moveFlowInterruptionCapturedOutward(context: Context) {
		if (!context.capturer.hasCaptured()) {
			return
		}

		// parent of flow interruption.
		let targetContext = context.parent!

		context.capturer.operator.moveCapturedOutwardTo(targetContext.capturer)
	}


	/** 
	 * Move conditional or switch tracking outward.
	 * `if (a.b) ...`-> `track(a.b), if ...`
	 * `switch (a.b) ...`-> `track(a.b), switch ...`
	 * 
	 * Note it will move conditional branches merged outer,
	 * so must ensure content is `Conditional` only, not `ConditionalContent`.
	 */
	function moveConditionalOrSwitchCapturedOutward(context: Context) {
		if (!context.capturer.hasCaptured()) {
			return
		}

		// parent of conditional.
		let targetContext = context.parent!
		context.capturer.operator.moveCapturedOutwardTo(targetContext.capturer)
	}


	/** 
	 * Merge all branches tracking and move outward.
	 * `if (...) {a.b} else {a.b}` -> `track(a.b), if ...`
	 */
	function mergeConditionalContentCapturedBranches(context: Context) {
		let contentChildren = context.children.filter(child => {
			return child.type & ContextTypeMask.ConditionalContent
		})

		// Must have both two branches.
		let canMerge = contentChildren.length >= 2
		if (!canMerge) {
			return
		}

		let capturers = contentChildren.map(c => c.capturer)
		let shared = ContextCapturerOperator.intersectCapturedItems(capturers)

		if (shared.length === 0) {
			return
		}

		context.capturer.operator.moveCapturedOutwardFrom(shared, contentChildren[0].capturer)
	}


	/** 
	 * Merge all case tracking and move outward.
	 * `case a.b: ... case a.b + 1: ...` -> `track(a.b); ...`
	 */
	function mergeCaseConditionCapturedBranches(context: Context) {
		let caseChildren = context.children.filter(child => {
			return child.type & ContextTypeMask.CaseDefault
		})

		let capturers = caseChildren.map(c => c.capturer)
		let shared = ContextCapturerOperator.intersectCapturedItems(capturers)

		if (shared.length === 0) {
			return
		}

		context.capturer.operator.moveCapturedOutwardFrom(shared, caseChildren[0].capturer)
	}


	/** 
	 * Merge all case content tracking and move outward.
	 * `case xxx: a.b; case xxx: a.b` -> `track(a.b); ...`
	 */
	function mergeCaseContentCapturedBranches(context: Context) {
		let caseContentChildren = context.children.map(child => child.children).flat().filter(child => {
			return child.type & ContextTypeMask.CaseDefaultContent
		})

		let capturers = caseContentChildren.map(c => c.capturer)
		let shared = ContextCapturerOperator.intersectCapturedItems(capturers)

		if (shared.length === 0) {
			return
		}

		context.capturer.operator.moveCapturedOutwardFrom(shared, caseContentChildren[0].capturer)
	}


	/** 
	 * Move whole content of iteration initializer outward.
	 * `for(let c = a.b;)` -> `track(a.b); for ...`.
	 */
	function moveIterationInitializerCapturedOutward(context: Context) {
		if (!context.capturer.hasCaptured()) {
			return
		}

		let toPosition = ContextTree.findClosestPositionToAddStatements(
			context.visitIndex, context
		)

		Modifier.moveOnce(context.visitIndex, toPosition.index)
		context.capturer.operator.moveCapturedOutwardTo(toPosition.context.capturer)
	}


	/** Move iteration condition or increasement or expression tracking outward. */
	function moveIterationConditionIncreasementExpressionOutward(context: Context) {
		if (!context.capturer.hasCaptured()) {
			return
		}

		// parent of iteration.
		let targetContext = context.parent!.parent!

		context.capturer.operator.moveCapturedOutwardTo(targetContext.capturer)
	}


	/** 
	 * Move iteration condition or increasement or expression tracking inward to iteration content.
	 * `for (let a = xx; a.b; )` -> `for (...) {track(a.b); ...}`
	 */
	function moveIterationConditionIncreasementExpressionToIteration(context: Context) {
		if (!context.capturer.hasCaptured()) {
			return
		}

		// iteration content.
		let targetContext = context.parent!.children.find(c => c.type & ContextTypeMask.IterationContent)
		if (targetContext) {
			context.capturer.operator.moveCapturedBackwardTo(targetContext.capturer)
		}
	}


	/** 
	 * Move iteration tracking outward.
	 * `for (...) {a.b}` -> `track(a.b); for ...`
	 */
	function moveIterationContentCapturedOutward(context: Context) {
		if (!context.capturer.hasCaptured()) {
			return
		}

		// parent of iteration.
		let targetContext = context.parent!.parent!

		context.capturer.operator.moveCapturedOutwardTo(targetContext.capturer)
	}


	/** 
	 * Move instantly run function like array methods tracking outward.
	 * `[].map(i => {i + a.b})` -> `track(a.b); [].map...`
	 */
	function moveInstantlyRunFunctionCapturedOutward(context: Context) {
		if (!context.capturer.hasCaptured()) {
			return
		}

		// parent of array method.
		let targetContext = context.parent!

		context.capturer.operator.moveCapturedOutwardTo(targetContext.capturer)
	}


	/** 
	 * Eliminate repetitive captured indices that repeat itself or with it's descendants.
	 * `track(a.b); if (...) {track(a.b)}` -> `track(a.b); if (...) {}`
	 */
	function eliminateRepetitiveCapturedRecursively(context: Context) {
		context.capturer.operator.eliminateRepetitiveRecursively(new Set())
	}


	/** 
	 * Eliminate private and don't have both get and set tracking types.
	 * `class {private prop}`, has only `prop` getting, or only setting -> remove it.
	 */
	function eliminatePrivateUniqueTrackingType(context: Context) {
		enum TypeMask {
			Get = 1,
			Set = 2,
		}

		let classNode = context.node as TS.ClassLikeDeclaration
		let nameMap: Map<string, {indices: number[], typeMask: TypeMask | 0}> = new Map()


		// Group captured by property name.
		for (let {name, index, type} of context.capturer.operator.walkPrivateCaptured(classNode)) {
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

		context.capturer.operator.removeCapturedIndicesRecursively(removeIndices)
	}
}