import type TS from 'typescript'
import {helper, ts, visiting} from '../../base'
import {Context} from './context'


export enum ContextType {

	/** Source file. */
	SourceFile,

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

	/** `while (...)`, `for (; ...; ...)` */
	IterationConditionIncreasement,

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

		// Source file
		if (ts.isSourceFile(node)) {
			return ContextType.SourceFile
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

		// `if (...) ...`
		else if (ts.isIfStatement(parent)) {
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
		else if (ts.isSwitchStatement(parent) || ts.isCaseClause(parent)) {
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
				return ContextType.IterationConditionIncreasement
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
				return ContextType.IterationConditionIncreasement
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


	/** 
	 * Walk context itself and descendants.
	 * Always walk descendants before self.
	 */
	export function* walkInwardChildFirst(context: Context, filter: (context: Context) => boolean): Iterable<Context> {
		for (let child of context.children) {
			yield *walkInwardChildFirst(child, filter)
		}

		if (filter(context)) {
			yield context
		}
	}

	/** 
	 * Walk context itself and descendants.
	 * Always walk descendants after self.
	 */
	export function* walkInwardSelfFirst(context: Context, filter: (context: Context) => boolean): Iterable<Context> {
		if (filter(context)) {
			yield context
		}

		for (let child of context.children) {
			yield *walkInwardSelfFirst(child, filter)
		}
	}

	
	/** Get the context leaves when walking from a context to an ancestral context. */
	export function getWalkingOutwardLeaves(fromContext: Context, toContext: Context) : Context[] {
		let context: Context | undefined = fromContext
		let leaves: Context[] = []

		// Look outward for a node which can pass test.
		while (context !== undefined && context !== toContext) {
			leaves.push(context)
			context = context.parent!
		}

		return leaves
	}
	

	/** Check at which context the specified named variable declared, or this attached. */
	export function getVariableDeclaredContext(name: string, context = ContextTree.current!): Context | null {
		if (context.variables.hasLocalVariable(name)) {
			return context
		}
		else if (context.parent) {
			return getVariableDeclaredContext(name, context.parent!)
		}
		else {
			return null
		}
	}


	/** Find an ancestral context, which can insert variable to. */
	export function findClosestPositionToAddVariable(index: number, from: Context): ContextTargetPosition {
		let context = from
		let variableDeclarationIndex = visiting.findOutward(index, from.visitingIndex, ts.isVariableDeclaration)
	
		// Look upward for a variable declaration.
		if (variableDeclarationIndex !== null) {
			return {
				context,
				index: variableDeclarationIndex,
			}
		}

		let node = visiting.getNode(index)

		while (true) {

			// Will not extend from `if()...` to `if(){...}`.
			if (helper.pack.canPutStatements(node)) {
				break
			}

			if (node === context.node) {
				context = context.parent!
			}

			node = node.parent
		}

		return {
			context,
			index: visiting.getFirstChildIndex(visiting.getIndex(node))!,
		}
	}

	/** 
	 * Find a ancestral context, which can move statements to it.
	 * Must before current position, and must not cross any conditional or iteration context.
	 */
	export function findClosestPositionToAddStatement(index: number, from: Context): ContextTargetPosition {
		let context: Context | null = from
		let parameterIndex = visiting.findOutward(index, from.visitingIndex, ts.isParameter)

		// Parameter initializer, no place to insert statements, returns position itself.
		if (parameterIndex !== null) {
			return {
				context,
				index,
			}
		}

		let node = visiting.getNode(index)

		while (true) {

			// Can extend from `if()...` to `if(){...}`, insert before node.
			if (helper.pack.canExtendToPutStatements(node)) {
				break
			}

			// `{...}`, insert before node.
			if (helper.pack.canPutStatements(node.parent)) {

				// Context of node.parent.
				if (node === context.node) {
					context = context.parent!
				}
				break
			}

			// To outer context.
			if (node === context.node) {
				
				// Can't cross these types of node, end here.
				if (context.type === ContextType.ConditionalCondition
					|| context.type === ContextType.ConditionalContent
					|| context.type === ContextType.IterationConditionIncreasement
					|| context.type === ContextType.IterationContent
				) {
					break
				}

				context = context.parent!
			}

			node = node.parent
		}

		return {
			context,
			index: visiting.getIndex(node),
		}
	}
}