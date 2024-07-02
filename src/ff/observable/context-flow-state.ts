import type TS from 'typescript'
import {Context} from './context'
import {ContextType} from './context-tree'
import {helper, ts} from '../../base'


export class ContextFlowState {

	readonly context: Context

	/** 
	 * Whether function has nothing returned.
	 * If a method returns nothing, and changes no outer variable or parameters,
	 * we mark it has no side effects, and stop tracking it.
	 * Only available for function-like type of context.
	 */
	readonly nothingReturned: boolean

	/** 
	 * Whether inner codes has `break`, or `continue` to stop current execution flow.
	 * If would break inside, end collected tracking expressions before it.
	 * Broadcast it to parent until closest iteration or switch context.
	 */
	breakInside: boolean = false

	/** 
	 * Whether inner codes has return statement to return before execution to end.
	 * Broadcast it to parent until closest function like context.
	 * `yield`, `await` are treated as `return`.
	 */
	returnInside: boolean = false

	constructor(context: Context) {
		this.context = context
		this.nothingReturned = this.checkNothingReturned()
	}

	private checkNothingReturned(): boolean {
		let node = this.context.node

		// Inherit from parent context.
		if (this.context.type !== ContextType.FunctionLike) {
			return this.context.parent?.flowState.nothingReturned ?? false
		}

		let type = helper.getNodeReturnType(node as TS.FunctionLikeDeclaration)
		return !!(type && (type.getFlags() & ts.TypeFlags.Void))
	}

	/** Visit each descendant node, returns whether break or return. */
	visitNode(node: TS.Node): boolean {

		// Handle return like.
		if (ts.isReturnStatement(node)
			|| ts.isAwaitExpression(node)
			||ts.isYieldExpression(node)
		) {
			return this.returnInside = true
		}

		// Handle break like.
		else if (ts.isBreakStatement(node)
			|| ts.isContinueStatement(node)
		) {
			return this.breakInside = true
		}

		return false
	}

	/** 
	 * After a child context is visiting completed, visit it.
	 * returns whether break or return.
	 */
	visitChildContext(child: Context) {

		// Return would not broadcast out of function.
		if (child.flowState.returnInside
			&& child.type !== ContextType.FunctionLike) {
			return this.returnInside = true
		}

		// Break would not broadcast out of iteration and case default.
		if (child.flowState.breakInside
			&& child.type !== ContextType.Iteration
			&& child.type !== ContextType.CaseContent) {
			return this.breakInside = true
		}
		
		return false
	}
}