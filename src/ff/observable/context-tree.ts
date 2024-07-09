import type TS from 'typescript'
import {helper, ts} from '../../base'
import {Context} from './context'
import {VisitingTree} from './visiting-tree'


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

	/** Process For iteration initializer, condition, incrementor. */
	Iteration,

	/** `while (...)`, `for (...)` */
	IterationCondition,

	/** 
	 * `while () ...`, `for () ...`, May run for none, 1 time, multiple times.
	 * Content itself can be a block, or a normal expression.
	 */
	IterationContent,

	/** `return`, `break`, `continue`, `yield`, `await`. */
	BreakLike,
}


export namespace ContextTree {

	let contextStack: Context[] = []
	export let current: Context | null = null


	/** Initialize before visiting a new source file. */
	export function initialize() {
		contextStack = []
		current = null
	}

	/** Check Context type of a node. */
	export function checkContextType(node: TS.Node): ContextType | null {

		// Block like, module contains a block inside.
		if (ts.isSourceFile(node)
			|| ts.isBlock(node)
		) {
			return ContextType.BlockLike
		}

		// Function like
		else if (helper.isFunctionLike(node)) {
			return ContextType.FunctionLike
		}

		// Conditional.
		// For `if...else if...`, the second if will be identified as `Conditional`.
		else if (ts.isIfStatement(node)
			|| ts.isSwitchStatement(node)
			|| ts.isConditionalExpression(node)

			//  `a && b`, `a || b`, `a ?? b`
			|| ts.isBinaryExpression(node) && (
				node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
				|| node.operatorToken.kind === ts.SyntaxKind.BarBarToken
				|| node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
			)

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

		// BreakLike
		// `break` and `continue` contains no expressions, so should not be a context type.
		else if (ts.isReturnStatement(node) && node.expression
			|| ts.isAwaitExpression(node)
			|| ts.isYieldExpression(node)
		) {
			return ContextType.BreakLike
		}

		//// Note `case` and `default` will be handled outside.

		let parent = node.parent
		if (!parent) {
			return null
		}

		// `if () ...`
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

			// initializer is not a standard expression, can be a variable statement.
			if (node === parent.initializer
				|| node === parent.condition
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

		if (current) {
			contextStack.push(current)
		}

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
	export function findClosestContextToAddVariable(from: Context): Context {
		let context = from
		while (context) {
			let node = context.node

			// Not extend from `if()...` to `if(){...}`.
			if (helper.canPutStatements(node)) {
				return context
			}

			// `for(let ...; ...)`
			if (ts.isForStatement(node.parent)
				&& node === node.parent.initializer
				&& ts.isVariableDeclarationList(node)
			) {
				return context
			}

			context = context.parent!
		}

		throw new Error(`Can't find context to put variable, there must be a mistake!`)
	}

	/** 
	 * Find a ancestral context, which can move statements to it.
	 * Must before current position, and must not cross any conditional or iteration context.
	 */
	export function findClosestPositionToMoveStatements(index: number, from: Context):
		{context: Context, index: number} | null
	{
		let context: Context | null = from

		while (context) {

			// Can extend from `if()...` to `if(){...}`.
			if (helper.canMayExtendToPutStatements(context.node)) {
				break
			}

			if (context.type === ContextType.ConditionalContent
				|| context.type  === ContextType.IterationContent
			) {
				context = null
				break
			}

			index = context.visitingIndex
			context = context.parent!
		}

		if (!context) {
			return null
		}

		if (helper.canPutStatements(context.node)) {

			// Look up until parent is context node.
			while (VisitingTree.getParentIndex(index) !== context.visitingIndex) {
				index = VisitingTree.getParentIndex(index)
			}
		}
		else {
			index = context.visitingIndex
		}

		return {
			context,
			index,
		}
	}
}