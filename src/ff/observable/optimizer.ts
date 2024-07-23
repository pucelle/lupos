import {modifier} from '../../base'
import {Context} from './context'
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
		if (!context.capturer.hasCaptured()) {
			return
		}

		if (context.type === ContextType.FunctionLike) {
			moveParameterCapturedToBody(context)
		}
		else if (context.type === ContextType.IterationInitializer) {
			moveIterationInitializerForward(context)
		}
	}


	/** Move captured from parameter to following function body. */
	function moveParameterCapturedToBody(context: Context) {
		context.capturer.moveCapturedAheadOf(context.children[0].capturer)
	}


	/** Move whole content from iteration initializer forward. */
	function moveIterationInitializerForward(context: Context) {
		let toPosition = ContextTree.findClosestPositionToAddStatement(
			context.visitingIndex, context
		)

		modifier.moveOnce(context.visitingIndex, toPosition.index)
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