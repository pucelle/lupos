import {modifier} from '../../base'
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
		if (context.type === ContextType.ConditionalCondition) {
			moveConditionalConditionOutward(context)
		}
		else if (context.type === ContextType.Conditional
			|| context.type === ContextType.ConditionalAndContent
		) {
			mergeConditionalBranches(context)
		}
		else if (context.type === ContextType.IterationInitializer) {
			moveIterationInitializerForward(context)
		}
		else if (context.type === ContextType.IterationConditionIncreasement) {
			moveIterationConditionIncreasementOutward(context)
		}
		else if (context.type === ContextType.IterationContent) {
			moveIterationContentOutward(context)
		}

		if (context.type === ContextType.FunctionLike) {
			eliminateRepetitiveWithAncestorsRecursively(context)
		}

		eliminateOwnRepetitive(context)
	}


	/** Move conditional condition tracking outward. */
	function moveConditionalConditionOutward(context: Context) {
		if (!context.capturer.hasCaptured()) {
			return
		}

		// parent of if conditional.
		let targetContext = context.parent!.parent!

		context.capturer.moveCapturedOutwardTo(targetContext.capturer)
	}


	/** Merge all branches tracking and move outward. */
	function mergeConditionalBranches(context: Context) {
		let contentChildren = context.children.filter(child => {
			return child.type === ContextType.ConditionalContent
				|| child.type === ContextType.ConditionalAndContent
		})

		if (contentChildren.length <= 1) {
			return
		}

		let capturers = contentChildren.map(c => c.capturer)
		let shared = ContextCapturer.intersectIndices(capturers)

		if (shared.length === 0) {
			return
		}

		context.capturer.moveCapturedIndicesTo(shared, context.capturer)
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


	/** Eliminate repetitive captured indices that repeat with it's ancestors. */
	function eliminateRepetitiveWithAncestorsRecursively(context: Context) {
		context.capturer.eliminateRepetitiveRecursively(new Set())
	}


	/** Eliminate repetitive captured. */
	function eliminateOwnRepetitive(context: Context) {
		context.capturer.eliminateOwnRepetitive()
	}


	// /** Lift node to outer context. */
	// function getLiftedContext(node: CanObserveNode): ObservedContext | null {
	// 	if (this.helper.isPropertyAccessing(node)) {
	// 		let exp = node.expression

	// 		if (ObservedChecker.canObserve(exp, this.helper)) {
	// 			return this.getLiftedContext(exp)
	// 		}
	// 		else {
	// 			return null
	// 		}
	// 	}
	// 	else {
	// 		if (node.pos === -1) {
	// 			return null
	// 		}
	// 		// else if (node.kind === this.helper.ts.SyntaxKind.ThisKeyword) {
	// 		// 	if (this.parent && this.helper.ts.isArrowFunction(this.parent.node)) {
	// 		// 		return this.parent.parent!.getLiftedContext(node)
	// 		// 	}
	// 		// 	else {
	// 		// 		return this
	// 		// 	}
	// 		// }
	// 		// else if (this.variableObserved.has(node.getText())) {
	// 		// 	return this
	// 		// }
	// 		else if (this.parent) {
	// 			return this.parent.getLiftedContext(node)
	// 		}
	// 		else {
	// 			return null
	// 		}
	// 	}
	// }
}