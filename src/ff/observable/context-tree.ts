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
	 * May run or not run.
	 * Normally the conditional content of `if`, `else`...
	 * Content itself may be a block, or a normal expression.
	 */
	ConditionalContent,

	/** 
	 * For `case` or `default`.
	 * It uses the `case` or `default` node as context node.
	 */
	CaseContent,

	/** 
	 * true and false part of `a ? b : c`,
	 * or right part of `a && b`, `a || b`, `a ?? b`.
	 */
	LogicContent,

	/** Process For iteration initializer, condition, incrementor. */
	Iteration,

	/** 
	 * `for () {...}`, May run for none, 1 time, multiple times.
	 * Content itself can be a block, or a normal expression.
	 */
	IterationContent,
}


export namespace ContextTree {

	const ContextStack: Context[] = []
	export let current: Context | null = null


	/** 
	 * Check Context type of a node.
	 * No content type, includes `ConditionalContent` & `IterationContent` checked.
	 */
	export function checkContextType(node: TS.Node): ContextType | null {
		
		// ConditionalContent, must before Block-like.
		// `case` and `default` will be handled outside.
		let parent = node.parent
		if (parent) {

			// `if () ...`
			if (ts.isIfStatement(parent)) {
				if (node === parent.thenStatement) {
					return ContextType.ConditionalContent
				}
			}

			// `a ? b : c`
			else if (ts.isConditionalExpression(parent)) {
				if (node === parent.whenTrue || node === parent.whenFalse) {
					return ContextType.LogicContent
				}
			}

			// `a && b`, `a || b`, `a ?? b`.
			else if (ts.isBinaryExpression(parent)) {
				if ((parent.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
					|| parent.operatorToken.kind === ts.SyntaxKind.BarBarToken
					|| parent.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken)
					&& node === parent.right
				) {
					return ContextType.LogicContent
				}
			}

			// `for... of`, `for ... in`, `while ...`, `do ...`
			else if (ts.isForOfStatement(parent)
				|| ts.isForInStatement(parent)
				|| ts.isWhileStatement(parent)
				|| ts.isDoStatement(parent)
			) {
				if (node === parent.expression) {
					return ContextType.IterationContent
				}
			}

			// `for (let...; ;) ...`
			else if (ts.isForStatement(parent)) {
				if (node === parent.statement) {
					return ContextType.IterationContent
				}
			}
		}

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

		// Iteration
		else if (ts.isForOfStatement(node)
			|| ts.isForInStatement(node)
			|| ts.isForStatement(node)
			|| ts.isWhileStatement(node)
			|| ts.isDoStatement(node)
		) {
			return ContextType.Iteration
		}

		return null
	}

	
	/** Create a context from node and push to stack. */
	export function createContextAndPush(type: ContextType, node: TS.Node): Context {
		let context = new Context(type, node, current)

		if (current) {
			ContextStack.push(current)
		}

		return current = context
	}


	/** Pop context. */
	export function pop() {
		current!.beforeExit()
		current = ContextStack.pop()!
	}


	/** Visit each child node. */
	export function visitNode(node: TS.Node) {
		if (current) {
			current.visitNode(node)
		}
	}
}