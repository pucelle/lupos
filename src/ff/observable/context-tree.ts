import type TS from 'typescript'
import {ts} from '../../base'
import {Context} from './context'


export enum ContextType {
	BlockLike,

	/** 
	 * Process parameters only, inner contents give to block body.
	 * For ArrowFunction, may no block body exist, so note about the output.
	 */
	FunctionLike,

	/** `If`, `case`, all binary expressions. */
	Conditional,
	
	/** May run or not run. */
	ConditionalContent,

	/** 
	 * Case expressions.
	 * Context uses the `CaseClause` node as it's node,
	 * so note about the output.
	 */
	CaseContent,

	/** Process For iteration initializer, condition, incrementor. */
	Iteration,

	/** May run for none, 1 time, multiple times. */
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
			if (ts.isIfStatement(parent)) {
				if (node === parent.thenStatement) {
					return ContextType.ConditionalContent
				}
			}
			else if (ts.isConditionalExpression(parent)) {
				if (node === parent.whenTrue || node === parent.whenFalse) {
					return ContextType.ConditionalContent
				}
			}
			else if (ts.isForOfStatement(parent)
				|| ts.isForInStatement(parent)
				|| ts.isWhileStatement(parent)
				|| ts.isDoStatement(parent)
			) {
				if (node === parent.expression) {
					return ContextType.IterationContent
				}
			}
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

		// Conditional
		else if (ts.isIfStatement(node)
			|| ts.isConditionalExpression(node)

			//  a && b, a || b, a ?? b
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

		return null
	}

	
	/** Create a context from node and push to stack. */
	export function createContextAndPush(type: ContextType, node: TS.Node): Context {
		let context = new Context(type, node, current)

		if (current) {
			ContextStack.push(current)
			current.addChildContext(context)
		}

		return current = context
	}


	/** Pop context. */
	export function pop() {
		if (current) {
			current.postInit()
		}

		current = ContextStack.pop()!
	}


	/** Visit each child node. */
	export function visitChildNode(node: TS.Node) {
		if (current) {
			current.visitChildNode(node)
		}
	}
}