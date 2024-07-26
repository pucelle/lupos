import {modifier, ts} from '../../base'
import {Context} from './context'
import {ContextCapturer} from './context-capturer'
import {ContextTree, ContextType} from './context-tree'


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
	 * All child contexts have been optimized.
	 */
	export function optimize(context: Context) {
		if (context.type === ContextType.FlowInterruptWithContent) {
			moveFlowInterruptedOutward(context)
		}

		else if (context.type === ContextType.Conditional
			|| context.type === ContextType.ConditionalAndContent
		) {
			mergeConditionalContentBranches(context)

			// Must after merging.
			// For `ConditionalAndContent`, if moved to outer Conditional,
			// later it will also be moved outer.
			if (context.type === ContextType.Conditional) {
				moveConditionalOutward(context)
			}
		}

		else if (context.type === ContextType.IterationInitializer) {
			moveIterationInitializerForward(context)
		}

		// This optimizing has low risk.
		else if (context.type === ContextType.IterationConditionIncreasement) {
			moveIterationConditionIncreasementOutward(context)
		}

		// This optimizing has low risk.
		else if (context.type === ContextType.IterationContent) {
			moveIterationContentOutward(context)
		}

		if (context.type === ContextType.FunctionLike) {
			eliminateRepetitiveWithAncestorsRecursively(context)
		}
	}


	/** Move conditional tracking outward. */
	function moveFlowInterruptedOutward(context: Context) {
		if (!context.capturer.hasCaptured()) {
			return
		}

		// parent of conditional.
		let targetContext = context.parent!

		context.capturer.moveCapturedOutwardTo(targetContext.capturer)
	}


	/** Move conditional tracking outward. */
	function moveConditionalOutward(context: Context) {
		if (!context.capturer.hasCaptured()) {
			return
		}

		// parent of conditional.
		let targetContext = context.parent!
		context.capturer.moveCapturedOutwardTo(targetContext.capturer)
	}


	/** Merge all branches tracking and move outward. */
	function mergeConditionalContentBranches(context: Context) {
		let contentChildren = context.children.filter(child => {
			return child.type === ContextType.ConditionalContent
				|| child.type === ContextType.ConditionalAndContent
		})

		let canMerge = false

		// Case branches can always merge.
		if (ts.isSwitchStatement(context.node)) {
			canMerge = true
		}

		// Must have both two branches .
		else {
			canMerge = contentChildren.length >= 2
		}

		if (!canMerge) {
			return
		}

		let capturers = contentChildren.map(c => c.capturer)
		let shared = ContextCapturer.intersectIndices(capturers)

		if (shared.length === 0) {
			return
		}

		context.capturer.moveCapturedIndicesIn(shared, contentChildren[0].capturer)
	}


	/** Move whole content of iteration initializer outward. */
	function moveIterationInitializerForward(context: Context) {
		if (!context.capturer.hasCaptured()) {
			return
		}

		let toPosition = ContextTree.findClosestPositionToAddStatement(
			context.visitingIndex, context
		)

		modifier.moveOnce(context.visitingIndex, toPosition.index)
		context.capturer.moveCapturedOutwardTo(toPosition.context.capturer)
	}


	/** Move iteration condition or increasement tracking outward. */
	function moveIterationConditionIncreasementOutward(context: Context) {
		if (!context.capturer.hasCaptured()) {
			return
		}

		// parent of iteration.
		let targetContext = context.parent!.parent!

		context.capturer.moveCapturedOutwardTo(targetContext.capturer)
	}


	/** Move iteration content tracking outward. */
	function moveIterationContentOutward(context: Context) {
		if (!context.capturer.hasCaptured()) {
			return
		}

		// parent of iteration.
		let targetContext = context.parent!.parent!

		context.capturer.moveCapturedOutwardTo(targetContext.capturer)
	}


	/** Eliminate repetitive captured indices that repeat itself or with it's descendants. */
	function eliminateRepetitiveWithAncestorsRecursively(context: Context) {
		context.capturer.eliminateRepetitiveRecursively(new Set())
	}
}