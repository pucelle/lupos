import ts from 'typescript'


/** How the flow was interrupted. */
export enum FlowInterruptionTypeMask {

	/** Currently be or after which return. */
	Return = 1,

	/** Currently be or after which break or continue. */
	BreakLike = 2,

	/** Currently be or after which yield. */
	Yield = 4,

	/** Currently be or after which stops synchronous execution. */
	Await = 8,

	/** 
	 * Currently be or after which may stop synchronous execution.
	 * Like `if (xxx) {await ...}`.
	 */
	ConditionalAwait = 16,
}


export namespace TrackingHelper {
		
	/** 
	 * Get flow interruption type,
	 * it represents whether flow was interrupted be `return` with content,
	 * `yield`, `await`, or arrow function with implicit returning.
	 */
	export function getFlowInterruptionType(node: ts.Node): FlowInterruptionTypeMask {
		let type = 0

		if (ts.isReturnStatement(node)
			|| node.parent
				&& ts.isArrowFunction(node.parent)
				&& node === node.parent.body && !ts.isBlock(node)
		) {
			type |= FlowInterruptionTypeMask.Return
		}
		
		else if (ts.isBreakOrContinueStatement(node)) {
			type |= FlowInterruptionTypeMask.BreakLike
		}
		
		else if (ts.isYieldExpression(node)) {
			type |= FlowInterruptionTypeMask.Yield
		}

		else if (ts.isAwaitExpression(node)) {
			type |= FlowInterruptionTypeMask.Await
		}

		return type
	}
}