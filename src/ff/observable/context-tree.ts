import type TS from 'typescript'
import {helper, ts, visiting} from '../../base'
import {Context} from './context'


export enum ContextType {

	/** Block or a source file. */
	BlockLike,

	/** 
	 * Normally help to process parameters.
	 * or for ArrowFunction has no block-type body exist.
	 */
	FunctionLike,

	/** 
	 * `if`, `case`, `default`,
	 * or binary expressions like `a && b`, `a || b`, `a ?? b`.
	 */
	Conditional,

	/** 
	 * `if (...)`, `case ...`,
	 * or left part of binary expressions like `a && b`, `a || b`, `a ?? b`.
	 */
	ConditionalCondition,

	/** 
	 * Content of `if`, `else`;
	 * Content of `case`, `default`.
	 * Right part of binary expressions like `a && b`, `a || b`, `a ?? b`.
	 * 
	 */
	ConditionalContent,

	/** 
	 * For `if` of the `else if`.
	 * It acts as both `Conditional` and `ConditionalContent`.
	 */
	ConditionalAndContent,

	/** Process For iteration initializer, condition, incrementor. */
	Iteration,

	/** `for (let...)` */
	IterationInitializer,

	/** `while (...)`, `for (...)` */
	IterationCondition,

	/** 
	 * `while () ...`, `for () ...`, May run for none, 1 time, multiple times.
	 * Content itself can be a block, or a normal expression.
	 */
	IterationContent,

	/** `return`, `break`, `continue`, `yield`, `await`. */
	FlowInterruptWithContent,
}

/** Content and a visiting index position. */
export interface ContextTargetPosition{
	context: Context
	index: number

	/** 
	 * Indicates whether meet interrupt statement on the path,
	 * from current position to target position.
	 */
	interruptOnPath: boolean
}


export namespace ContextTree {

	let contextStack: (Context | null)[] = []
	export let current: Context | null = null


	/** Initialize before visiting a new source file. */
	export function initialize() {
		contextStack = []
		current = null
	}

	/** Check Context type of a node. */
	export function checkContextType(node: TS.Node): ContextType | null {
		let parent = node.parent

		// Block like, module contains a block inside.
		if (ts.isSourceFile(node)
			|| ts.isBlock(node)
		) {
			return ContextType.BlockLike
		}

		// Function like
		else if (helper.pack.isFunctionLike(node)) {
			return ContextType.FunctionLike
		}

		// For `if...else if...`, the second if will be identified as `ConditionalAndContent`.
		else if (ts.isIfStatement(node)) {
			if (ts.isIfStatement(parent) && node === parent.elseStatement) {
				return ContextType.ConditionalAndContent
			}
			else {
				return ContextType.Conditional
			}
		}

		// `a ? b : c`
		else if (ts.isConditionalExpression(node)) {
			if (ts.isConditionalExpression(parent) && (
				node === parent.whenTrue || node === parent.whenFalse
			)) {
				return ContextType.ConditionalAndContent
			}
			else {
				return ContextType.Conditional
			}
		}

		// Conditional.
		else if (
			
			//  `a && b`, `a || b`, `a ?? b`
			ts.isBinaryExpression(node) && (
				node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
				|| node.operatorToken.kind === ts.SyntaxKind.BarBarToken
				|| node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
			)

			// `switch(...) {...}`, `case(...): ...`, `default: ...`
			|| ts.isSwitchStatement(node)
			|| ts.isCaseClause(node)
			|| ts.isDefaultClause(node)
		) {
			return ContextType.Conditional
		}

		// Iteration
		else if (ts.isForOfStatement(node)
			|| ts.isForInStatement(node)
			|| ts.isForStatement(node)
			|| ts.isWhileStatement(node)
			|| ts.isDoStatement(node)
		) {
			return ContextType.Iteration
		}

		// Flow stop, and has content.
		// `break` and `continue` contains no expressions, so should not be a context type.
		else if (helper.pack.isFlowInterruption(node)) {
			return ContextType.FlowInterruptWithContent
		}

		
		//// Note `case` and `default` will be handled outside.
		if (!parent) {
			return null
		}

		// `if (...) ...`
		if (ts.isIfStatement(parent)) {
			if (node === parent.expression) {
				return ContextType.ConditionalCondition
			}
			else if (node === parent.thenStatement

				// For `if ... else if...`, the second if statement belongs to `Conditional`.
				|| node === parent.elseStatement
			) {
				return ContextType.ConditionalContent
			}
		}

		// `switch (...)`, `case (...)`
		if (ts.isSwitchStatement(parent) || ts.isCaseClause(parent)) {
			if (node === parent.expression) {
				return ContextType.ConditionalCondition
			}
		}

		// Content of `case` and `default` will be processed in `visitor.ts`.

		// `a ? b : c`
		else if (ts.isConditionalExpression(parent)) {
			if (node === parent.condition) {
				return ContextType.ConditionalCondition
			}
			else if (node === parent.whenTrue || node === parent.whenFalse) {
				return ContextType.ConditionalContent
			}
		}

		// `a && b`, `a || b`, `a ?? b`.
		else if (ts.isBinaryExpression(parent)) {
			if ((parent.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
				|| parent.operatorToken.kind === ts.SyntaxKind.BarBarToken
				|| parent.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken)
			) {
				if (node === parent.left) {
					return ContextType.ConditionalCondition
				}
				else if (node === parent.right) {
					return ContextType.ConditionalContent
				}
			}
		}

		// `for (;;) ...`
		else if (ts.isForStatement(parent)) {
			if (node === parent.initializer) {
				return ContextType.IterationInitializer
			}
			else if (node === parent.condition
				|| node === parent.incrementor
			) {
				return ContextType.IterationCondition
			}
			else if (node === parent.statement) {
				return ContextType.IterationContent
			}
		}

		// `for ... in`, `for ... of`, `while ...`, `do ...`
		else if (ts.isForOfStatement(parent)
			|| ts.isForInStatement(parent)
			|| ts.isWhileStatement(parent)
			|| ts.isDoStatement(parent)
		) {
			if (node === parent.expression) {
				return ContextType.IterationCondition
			}
			else if (node === parent.statement) {
				return ContextType.IterationContent
			}
		}

		return null
	}
	
	/** Create a context from node and push to stack. */
	export function createContext(type: ContextType, node: TS.Node): Context {
		let context = new Context(type, node, current)
		contextStack.push(current)

		return current = context
	}

	/** Pop context. */
	export function pop() {
		current!.beforeExit()
		current = contextStack.pop()!
	}

	/** 
	 * Visit context node and each descendant node within current context.
	 * Recently all child contexts have been visited.
	 */
	export function visitNode(node: TS.Node) {
		if (current) {
			current.visitNode(node)
		}
	}
	
	/** Find an ancestral context, which can insert variable to. */
	export function findClosestPositionToAddVariable(index: number, from: Context): ContextTargetPosition {
		let context = from
		let variableDeclarationIndex = visiting.findUpward(index, from.visitingIndex, ts.isVariableDeclaration)
		let interruptOnPath = false

		// Look upward for a variable declaration.
		if (variableDeclarationIndex !== null) {
			return {
				context,
				index: variableDeclarationIndex,
				interruptOnPath: false,
			}
		}

		while (context) {
			let node = context.node

			// Not extend from `if()...` to `if(){...}`.
			if (helper.pack.canPutStatements(node)) {
				break
			}

			context = context.parent!
			interruptOnPath ||= context.state.isSelfFlowStop()
		}

		return {
			context,
			index: visiting.getFirstChildIndex(context.visitingIndex)!,
			interruptOnPath,
		}
	}

	/** 
	 * Find a ancestral context, which can move statements to it.
	 * Must before current position, and must not cross any conditional or iteration context.
	 */
	export function findClosestPositionToAddStatement(index: number, from: Context): ContextTargetPosition {
		let context: Context | null = from
		let interruptOnPath = false

		// Parameter initializer, no place to insert statements, returns position itself.
		if (context.type === ContextType.FunctionLike) {
			return {
				context,
				index,
				interruptOnPath,
			}
		}

		while (context) {

			// Can extend from `if()...` to `if(){...}`.
			if (helper.pack.canMayExtendToPutStatements(context.node)) {
				break
			}

			// Now index can be located to context visiting index for easier looking upward.
			index = context.visitingIndex

			interruptOnPath ||= context.state.isSelfFlowStop()

			// Can't cross these types of context.

			// `if condition` can be referenced forward, but `else if condition` can't.
			// Same as `a ? b : c ? d : e`.
			if (context.type === ContextType.ConditionalCondition
					&& context.parent!.type === ContextType.ConditionalAndContent

				|| context.type === ContextType.ConditionalContent
				|| context.type === ContextType.IterationCondition
				|| context.type === ContextType.IterationContent
			) {
				break
			}

			context = context.parent!
		}

		if (helper.pack.canPutStatements(context.node)) {

			// Look up until parent is context node.
			while (visiting.getParentIndex(index) !== context.visitingIndex) {
				index = visiting.getParentIndex(index)!
			}
		}
		else {
			index = context.visitingIndex
		}

		return {
			context,
			index,
			interruptOnPath,
		}
	}
}