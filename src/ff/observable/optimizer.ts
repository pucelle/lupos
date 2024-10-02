import type TS from 'typescript'
import {Helper, Modifier, ts} from '../../base'
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
		if (context.type & ContextTypeMask.FlowInterruption) {
			moveFlowInterruptionCapturedOutward(context)
		}

		if (context.type & ContextTypeMask.Conditional) {
			mergeConditionalContentCapturedBranches(context)

			// Must after merging.
			// For `ConditionalContent`, if moving to outer Conditional,
			// later it will be moved outer again, until out-most Non-Conditional.
			if ((context.type & ContextTypeMask.ConditionalContent) === 0) {
				moveConditionalCapturedOutward(context)
			}
		}

		// Move tracking codes of `for(let xxx;)` outward.
		if (context.type & ContextTypeMask.IterationInitializer) {
			moveIterationInitializerCapturedOutward(context)
		}

		// This optimizing has low risk, loop codes may not run when have no looping.
		if (context.type & ContextTypeMask.IterationCondition
			|| context.type & ContextTypeMask.IterationIncreasement
			|| context.type & ContextTypeMask.IterationExpression
		) {
			moveIterationConditionIncreasementExpressionOutward(context)
			moveIterationConditionIncreasementExpressionBackward(context)
		}

		// This optimizing has low risk, loop codes may not run when have no looping.
		if (context.type & ContextTypeMask.IterationContent) {
			moveIterationContentCapturedOutward(context)
		}

		// Eliminate repetitive.
		if (context.type & ContextTypeMask.FunctionLike) {
			eliminateRepetitiveCapturedRecursively(context)
		}

		// Eliminate private and don't have both get and set tracking types.
		if (context.type & ContextTypeMask.Class) {
			eliminateUniqueTrackingTypePrivate(context)
		}
	}


	/** Move flow interruption tracking outward. */
	function moveFlowInterruptionCapturedOutward(context: Context) {
		if (!context.capturer.hasCaptured()) {
			return
		}

		// parent of flow interruption.
		let targetContext = context.parent!

		context.capturer.operator.moveCapturedOutwardTo(targetContext.capturer)
	}


	/** Move conditional tracking outward. */
	function moveConditionalCapturedOutward(context: Context) {
		if (!context.capturer.hasCaptured()) {
			return
		}

		// parent of conditional.
		let targetContext = context.parent!
		context.capturer.operator.moveCapturedOutwardTo(targetContext.capturer)
	}


	/** Merge all branches tracking and move outward. */
	function mergeConditionalContentCapturedBranches(context: Context) {
		let contentChildren = context.children.filter(child => {
			return child.type & ContextTypeMask.ConditionalContent
		})

		let canMerge = false

		// Merge different case conditions.
		if (ts.isSwitchStatement(context.node)) {
			canMerge = true
		}

		// Must have both two branches.
		else {
			canMerge = contentChildren.length >= 2
		}

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


	/** Move whole content of iteration initializer outward. */
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


	/** Move iteration condition or increasement or expression tracking inward to iteration content. */
	function moveIterationConditionIncreasementExpressionBackward(context: Context) {
		if (!context.capturer.hasCaptured()) {
			return
		}

		// parent of iteration.
		let targetContext = context.parent!.children.find(c => c.type & ContextTypeMask.IterationContent)
		if (targetContext) {
			context.capturer.operator.moveCapturedBackwardTo(targetContext.capturer)
		}
	}


	/** Move iteration content tracking outward. */
	function moveIterationContentCapturedOutward(context: Context) {
		if (!context.capturer.hasCaptured()) {
			return
		}

		// parent of iteration.
		let targetContext = context.parent!.parent!

		context.capturer.operator.moveCapturedOutwardTo(targetContext.capturer)
	}


	/** Eliminate repetitive captured indices that repeat itself or with it's descendants. */
	function eliminateRepetitiveCapturedRecursively(context: Context) {
		context.capturer.operator.eliminateRepetitiveRecursively(new Set())
	}


	/** Eliminate private and don't have both get and set tracking types. */
	function eliminateUniqueTrackingTypePrivate(context: Context) {
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