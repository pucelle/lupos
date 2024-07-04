import type TS from 'typescript'
import {ts} from '../../base'
import {Context} from './context'


export enum ContextType {

	/** Block or a source file. */
	BlockLike,

	/** 
	 * Normally help to process parameters.
	 * or for ArrowFunction and no block body exist.
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

	/** Right part of binary expressions like `a && b`, `a || b`, `a ?? b`. */
	ConditionalExpContent,

	/** 
	 * For `if`, `else`.
	 * Content itself can be extended to a block.
	 */
	ConditionalIfElseContent,

	/** 
	 * For `case` or `default`.
	 * It uses the `case` or `default` node as context node.
	 */
	ConditionalCaseContent,

	/** Process For iteration initializer, condition, incrementor. */
	Iteration,

	/** `while (...)`, `for (...)` */
	IterationCondition,

	/** 
	 * `for () {...}`, May run for none, 1 time, multiple times.
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
		else if (ts.isMethodDeclaration(node)
			|| ts.isFunctionDeclaration(node)
			|| ts.isFunctionExpression(node)
			|| ts.isGetAccessorDeclaration(node)
			|| ts.isSetAccessorDeclaration(node)
			|| ts.isArrowFunction(node)
		) {
			return ContextType.FunctionLike
		}

		// Conditional
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
			//|| ts.isBreakOrContinueStatement(node)
			|| ts.isAwaitExpression(node)
			|| ts.isYieldExpression(node)
		) {
			return ContextType.BreakLike
		}

		//// Note `case` and `default` will be handled outside.

		let parent = node.parent
		if (parent) {

			// `if () ...`
			if (ts.isIfStatement(parent)) {
				if (node === parent.expression) {
					return ContextType.ConditionalCondition
				}
				else if (node === parent.thenStatement

					// For `if ... else if...`, the second if statement belongs to `Conditional`.
					|| node === parent.elseStatement
				) {
					return ContextType.ConditionalIfElseContent
				}
			}

			// `a ? b : c`
			else if (ts.isConditionalExpression(parent)) {
				if (node === parent.condition) {
					return ContextType.ConditionalCondition
				}
				else if (node === parent.whenTrue || node === parent.whenFalse) {
					return ContextType.ConditionalExpContent
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
						return ContextType.ConditionalExpContent
					}
				}
			}

			// `for (;;) ...`
			else if (ts.isForStatement(parent)) {
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


	/** Visit context node and each descendant node. */
	export function visitNode(node: TS.Node) {
		if (current) {
			current.visitNode(node)
		}
	}
}