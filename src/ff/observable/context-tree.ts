import type TS from 'typescript'
import {Helper, ts, VisitTree} from '../../core'
import {Context} from './context'


export enum ContextTypeMask {

	/** Source file. */
	SourceFile = 2 ** 0,

	/** Class range. */
	Class = 2 ** 1,

	/** 
	 * Function.
	 * Normally help to process parameters.
	 * or for ArrowFunction has no block-type body exist.
	 */
	FunctionLike = 2 ** 2,

	/** Function, but it should instantly run. */
	InstantlyRunFunction = 2 ** 3,

	/** 
	 * `if`, `case`, `default`,
	 * or binary expressions like `a && b`, `a || b`, `a ?? b`.
	 */
	Conditional = 2 ** 4,

	/** 
	 * Content of `if`, `else`;
	 * Whole `case ...`, `default ...`.
	 * Right part of binary expressions like `a && b`, `a || b`, `a ?? b`.
	 */
	ConditionalContent = 2 ** 5,

	/** `case ...: ...`, `default ...` */
	CaseDefaultContent = 2 ** 6,

	/** Process For iteration initializer, condition, incrementor. */
	Iteration = 2 ** 7,

	/** `for (let...)` */
	IterationInitializer = 2 ** 8,

	/** `while (...)`, `for (; ...; )` */
	IterationCondition = 2 ** 9,

	/** `for (; ; ...)` */
	IterationIncreasement = 2 ** 10,

	/** `for (let xxx of ...)` */
	IterationExpression = 2 ** 11,

	/** 
	 * `while () ...`, `for () ...`, May run for none, 1 time, multiple times.
	 * Content itself can be a block, or a normal expression.
	 */
	IterationContent = 2 ** 12,

	/** `return`, `break`, `continue`, `yield `, `await`, and with content. */
	FlowInterruption = 2 ** 13,
}

/** Content and a visit index position. */
export interface ContextTargetPosition{
	context: Context
	index: number
}


export namespace ContextTree {

	let contextStack: (Context | null)[] = []
	let current: Context | null = null

	/** Visit index -> Context. */
	const ContextMap: Map<number, Context> = new Map()


	/** Initialize before visiting a new source file. */
	export function init() {
		contextStack = []
		current = null
		ContextMap.clear()
	}

	/** Check Context type of a node. */
	export function checkContextType(node: TS.Node): ContextTypeMask | 0 {
		let parent = node.parent
		let type = 0

		// Source file
		if (ts.isSourceFile(node)) {
			type |= ContextTypeMask.SourceFile
		}

		// Class
		else if (ts.isClassLike(node)) {
			type |= ContextTypeMask.Class
		}

		// Function like
		else if (Helper.isFunctionLike(node)) {
			type |= ContextTypeMask.FunctionLike

			if (Helper.isInstantlyRunFunction(node)) {
				type |= ContextTypeMask.InstantlyRunFunction
			}
		}

		// For `if...else if...`
		else if (ts.isIfStatement(node)) {
			type |= ContextTypeMask.Conditional
		}

		// `a ? b : c`
		else if (ts.isConditionalExpression(node)) {
			type |= ContextTypeMask.Conditional
		}

		//  `a && b`, `a || b`, `a ?? b`
		else if (ts.isBinaryExpression(node)
			&& (
				node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
				|| node.operatorToken.kind === ts.SyntaxKind.BarBarToken
				|| node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
			)
		) {
			type |= ContextTypeMask.Conditional
		}

		// `switch(...) {...}`
		else if (ts.isSwitchStatement(node)) {
			type |= ContextTypeMask.Conditional
		}

		// `case ...`, `default ...`.
		// Note for case expression `case ...`,
		// It's tracking expressions will be captured by whole context,
		// and insert to following statements.
		// This cause some risks, but normally we assume that `case ...`
		// should always work with static condition expression.
		else if (ts.isCaseOrDefaultClause(node)) {
			type |= (ContextTypeMask.ConditionalContent | ContextTypeMask.CaseDefaultContent)
		}

		// Iteration
		else if (ts.isForOfStatement(node)
			|| ts.isForInStatement(node)
			|| ts.isForStatement(node)
			|| ts.isWhileStatement(node)
			|| ts.isDoStatement(node)
		) {
			type |= ContextTypeMask.Iteration
		}

		// Flow stop, and has content.
		// `break` and `continue` contains no expressions, so should not be a context type.
		else if (Helper.pack.getFlowInterruptionType(node) > 0) {
			type |= ContextTypeMask.FlowInterruption
		}


		if (!parent) {
			return type
		}

		// `if (...) ...`
		if (ts.isIfStatement(parent)) {
			if (node === parent.thenStatement || node === parent.elseStatement) {
				type |= ContextTypeMask.ConditionalContent
			}
		}

		// `a ? b : c`
		else if (ts.isConditionalExpression(parent)) {
			if (node === parent.whenTrue || node === parent.whenFalse) {
				type |= ContextTypeMask.ConditionalContent
			}
		}

		// `a && b`, `a || b`, `a ?? b`.
		else if (ts.isBinaryExpression(parent)) {
			if ((parent.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
				|| parent.operatorToken.kind === ts.SyntaxKind.BarBarToken
				|| parent.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken)
			) {
				if (node === parent.right) {
					type |= ContextTypeMask.ConditionalContent
				}
			}
		}

		// `for (;;) ...`
		else if (ts.isForStatement(parent)) {
			if (node === parent.initializer) {
				type |= ContextTypeMask.IterationInitializer
			}
			else if (node === parent.condition) {
				type |= ContextTypeMask.IterationCondition
			}
			else if (node === parent.incrementor) {
				type |= ContextTypeMask.IterationIncreasement
			}
			else if (node === parent.statement) {
				type |= ContextTypeMask.IterationContent
			}
		}

		// `for ... in`, `for ... of`
		else if (ts.isForOfStatement(parent)
			|| ts.isForInStatement(parent)
		) {
			if (node === parent.initializer) {
				type |= ContextTypeMask.IterationInitializer
			}
			else if (node === parent.expression) {
				type |= ContextTypeMask.IterationExpression
			}
			else if (node === parent.statement) {
				type |= ContextTypeMask.IterationContent
			}
		}

		// `while ...`, `do ...`
		else if (ts.isWhileStatement(parent)
			|| ts.isDoStatement(parent)
		) {
			if (node === parent.expression) {
				type |= ContextTypeMask.IterationExpression
			}
			else if (node === parent.statement) {
				type |= ContextTypeMask.IterationContent
			}
		}

		return type
	}
	
	/** Create a context from node and push to stack. */
	export function createContext(type: ContextTypeMask, node: TS.Node): Context {
		let index = VisitTree.getIndex(node)
		let context = new Context(type, node, index, current)

		ContextMap.set(index, context)
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


	/** Find closest Context contains or equals node with specified visit index. */
	export function findClosest(index: number): Context {
		let context = ContextMap.get(index)

		while (!context) {
			index = VisitTree.getParentIndex(index)!
			context = ContextMap.get(index)
		}

		return context
	}

	/** Find closest context contains or equals node. */
	export function findClosestByNode(node: TS.Node): Context {
		return findClosest(VisitTree.getIndex(node))
	}

	/** 
	 * Walk context itself and descendants.
	 * Always walk descendants before self.
	 */
	export function* walkInwardChildFirst(context: Context, filter?: (context: Context) => boolean): Iterable<Context> {
		if (!filter || filter(context)) {
			for (let child of context.children) {
				yield* walkInwardChildFirst(child, filter)
			}
	
			yield context
		}
	}

	/** 
	 * Walk context itself and descendants.
	 * Always walk descendants after self.
	 */
	export function* walkInwardSelfFirst(context: Context, filter?: (context: Context) => boolean): Iterable<Context> {
		if (!filter || filter(context)) {
			yield context
		
			for (let child of context.children) {
				yield* walkInwardSelfFirst(child, filter)
			}
		}
	}


	/** 
	 * Find an ancestral index and context, which can move statements to before it.
	 * Must before current position, and must not cross any conditional or iteration context.
	 */
	export function findClosestPositionToAddStatements(index: number, from: Context): ContextTargetPosition {
		let context = from
		let parameterIndex = VisitTree.findOutwardMatch(index, from.visitIndex, ts.isParameter)

		// Parameter initializer, no place to insert statements, returns position itself.
		if (parameterIndex !== undefined) {
			return {
				context,
				index,
			}
		}

		let node = VisitTree.getNode(index)

		while (true) {

			// Source file.
			if (ts.isSourceFile(node)) {
				break
			}

			// Can extend from `if()...` to `if(){...}`, insert before node.
			if (Helper.pack.canExtendToPutStatements(node)) {
				break
			}

			// `{...}`, insert before node.
			if (Helper.pack.canPutStatements(node.parent)) {

				// Context of node.parent.
				if (node === context.node) {
					context = context.parent!
				}
				break
			}

			// To outer context.
			if (node === context.node) {
				
				// Can't across these types of node, end at the inner start of it.
				if (context.type & ContextTypeMask.ConditionalContent
					|| context.type & (ContextTypeMask.IterationCondition
						| ContextTypeMask.IterationIncreasement
						| ContextTypeMask.IterationExpression
					)
					|| context.type & ContextTypeMask.IterationContent
				) {
					break
				}

				context = context.parent!
			}

			node = node.parent
		}

		return {
			context,
			index: VisitTree.getIndex(node),
		}
	}
}