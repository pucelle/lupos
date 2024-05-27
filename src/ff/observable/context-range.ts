import type ts from 'typescript'
import {SourceFileModifier, TSHelper} from '../../base'
import {Context} from './context'
import {PropertyAccessingNode} from './checker'


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


export namespace ContextRange {

	const ContextStack: Context[] = []
	let currentContext: Context | null = null


	/** 
	 * Check Context type of a node.
	 * No content type, includes `ConditionalContent` & `IterationContent` checked.
	 */
	export function checkContextType(node: ts.Node, helper: TSHelper): ContextType | null {
		
		// ConditionalContent, must before Block-like.
		// `case` and `default` will be handled later.
		let parent = node.parent
		if (parent) {
			if (helper.ts.isIfStatement(parent)) {
				if (node === parent.thenStatement) {
					return ContextType.ConditionalContent
				}
			}
			else if (helper.ts.isConditionalExpression(parent)) {
				if (node === parent.whenTrue || node === parent.whenFalse) {
					return ContextType.ConditionalContent
				}
			}
			else if (helper.ts.isForOfStatement(parent)
				|| helper.ts.isForInStatement(parent)
				|| helper.ts.isWhileStatement(parent)
				|| helper.ts.isDoStatement(parent)
			) {
				if (node === parent.expression) {
					return ContextType.IterationContent
				}
			}
			else if (helper.ts.isForStatement(parent)) {
				if (node === parent.statement) {
					return ContextType.IterationContent
				}
			}
		}

		// Block like
		if (helper.ts.isSourceFile(node)
			|| helper.ts.isModuleDeclaration(node)
			|| helper.ts.isBlock(node)
		) {
			return ContextType.BlockLike
		}

		// Function like
		else if (helper.ts.isMethodDeclaration(node)
			|| helper.ts.isFunctionDeclaration(node)
			|| helper.ts.isFunctionExpression(node)
			|| helper.ts.isGetAccessorDeclaration(node)
			|| helper.ts.isSetAccessorDeclaration(node)
			|| helper.ts.isArrowFunction(node)
		) {
			return ContextType.FunctionLike
		}

		// Conditional
		if (helper.ts.isIfStatement(node)
			|| helper.ts.isConditionalExpression(node)

			//  a && b, a || b, a ?? b
			|| helper.ts.isBinaryExpression(node) && (
				node.operatorToken.kind === helper.ts.SyntaxKind.AmpersandAmpersandToken
				|| node.operatorToken.kind === helper.ts.SyntaxKind.BarBarToken
				|| node.operatorToken.kind === helper.ts.SyntaxKind.QuestionQuestionToken
			)

			|| helper.ts.isCaseClause(node)
			|| helper.ts.isDefaultClause(node)
		) {
			return ContextType.Conditional
		}

		// Iteration
		if (helper.ts.isForOfStatement(node)
			|| helper.ts.isForInStatement(node)
			|| helper.ts.isForStatement(node)
			|| helper.ts.isWhileStatement(node)
			|| helper.ts.isDoStatement(node)
		) {
			return ContextType.Iteration
		}

		return null
	}

	
	/** Create a context from node and push to stack. */
	export function createdContextToPush(type: ContextType, node: ts.Node, modifier: SourceFileModifier): Context {
		let context = new Context(type, node, currentContext, modifier)

		if (currentContext) {
			ContextStack.push(currentContext)
		}

		return currentContext = context
	}


	/** Pop context. */
	export function pop() {
		if (currentContext) {
			currentContext.postInit()
		}

		currentContext = ContextStack.pop()!
	}


	/** Add a get expression. */
	export function addGetExpression(node: PropertyAccessingNode) {
		if (currentContext && currentContext.isAccessingObserved(node)) {
			currentContext.addGetExpression(node)
		}
	}
}