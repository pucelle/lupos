import {Modifier, ts} from '../../base'
import {Context} from './context'
import {ContextCapturer} from './context-capturer'
import {ContextTree, ContextTypeMask} from './context-tree'


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
		if (context.type & ContextTypeMask.FlowInterruption) {
			moveFlowInterruptionCapturingOutward(context)
		}

		if (context.type & ContextTypeMask.Conditional) {
			mergeConditionalContentCapturingBranches(context)

			// Must after merging.
			// For `ConditionalContent`, if moving to outer Conditional,
			// later it will be moved outer again, until out-most Non-Conditional.
			if ((context.type & ContextTypeMask.ConditionalContent) === 0) {
				moveConditionalCapturingOutward(context)
			}
		}

		if (context.type & ContextTypeMask.IterationInitializer) {
			moveIterationInitializerCapturingOutward(context)
		}

		// This optimizing has a low risk, codes may not run when no looping.
		if (context.type & ContextTypeMask.IterationConditionIncreasement) {
			moveIterationConditionIncreasementOutward(context)
		}

		// This optimizing has low risk, loop codes may not run when have no looping.
		if (context.type & ContextTypeMask.IterationContent) {
			moveIterationContentCapturingOutward(context)
		}

		if (context.type & ContextTypeMask.FunctionLike) {
			eliminateRepetitiveCapturingRecursively(context)
		}
	}


	/** Move flow interruption tracking outward. */
	function moveFlowInterruptionCapturingOutward(context: Context) {
		if (!context.capturer.hasCaptured()) {
			return
		}

		// parent of flow interruption.
		let targetContext = context.parent!

		context.capturer.moveCapturedOutwardTo(targetContext.capturer)
	}


	/** Move conditional tracking outward. */
	function moveConditionalCapturingOutward(context: Context) {
		if (!context.capturer.hasCaptured()) {
			return
		}

		// parent of conditional.
		let targetContext = context.parent!
		context.capturer.moveCapturedOutwardTo(targetContext.capturer)
	}


	/** Merge all branches tracking and move outward. */
	function mergeConditionalContentCapturingBranches(context: Context) {
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
		let shared = ContextCapturer.intersectIndices(capturers)

		if (shared.length === 0) {
			return
		}

		context.capturer.moveCapturedIndicesIn(shared, contentChildren[0].capturer)
	}


	/** Move whole content of iteration initializer outward. */
	function moveIterationInitializerCapturingOutward(context: Context) {
		if (!context.capturer.hasCaptured()) {
			return
		}

		let toPosition = ContextTree.findClosestPositionToAddStatements(
			context.visitingIndex, context
		)

		Modifier.moveOnce(context.visitingIndex, toPosition.index)
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
	function moveIterationContentCapturingOutward(context: Context) {
		if (!context.capturer.hasCaptured()) {
			return
		}

		// parent of iteration.
		let targetContext = context.parent!.parent!

		context.capturer.moveCapturedOutwardTo(targetContext.capturer)
	}


	/** Eliminate repetitive captured indices that repeat itself or with it's descendants. */
	function eliminateRepetitiveCapturingRecursively(context: Context) {
		context.capturer.eliminateRepetitiveRecursively(new Set())
	}
}