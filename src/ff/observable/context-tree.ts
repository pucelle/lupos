import type TS from 'typescript'
import {helper, ts, visiting} from '../../base'
import {Context} from './context'


export enum ContextTypeMask {

	/** Source file. */
	SourceFile = 2 ** 0,

	/** 
	 * Normally help to process parameters.
	 * or for ArrowFunction has no block-type body exist.
	 */
	FunctionLike = 2 ** 1,

	/** 
	 * `if`, `case`, `default`,
	 * or binary expressions like `a && b`, `a || b`, `a ?? b`.
	 */
	Conditional = 2 ** 2,

	/** 
	 * Content of `if`, `else`;
	 * Whole `case ...`, `default ...`.
	 * Right part of binary expressions like `a && b`, `a || b`, `a ?? b`.
	 */
	ConditionalContent = 2 ** 3,

	/** `case ...: ...`, `default ...` */
	CaseDefaultContent = 2 ** 4,

	/** Process For iteration initializer, condition, incrementor. */
	Iteration = 2 ** 5,

	/** `for (let...)` */
	IterationInitializer = 2 ** 6,

	/** `while (...)`, `for (; ...; ...)` */
	IterationConditionIncreasement = 2 ** 7,

	/** 
	 * `while () ...`, `for () ...`, May run for none, 1 time, multiple times.
	 * Content itself can be a block, or a normal expression.
	 */
	IterationContent = 2 ** 8,

	/** `return`, `break`, `continue`, `yield`, `await`, and with content. */
	FlowInterruption = 2 ** 9,
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
	export function checkContextType(node: TS.Node): number {
		let parent = node.parent
		let type = 0

		// Source file
		if (ts.isSourceFile(node)) {
			type |= ContextTypeMask.SourceFile
		}

		// Function like
		else if (helper.pack.isFunctionLike(node)) {
			type |= ContextTypeMask.FunctionLike
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
		else if (helper.pack.getFlowInterruptionType(node) > 0) {
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
			else if (node === parent.condition
				|| node === parent.incrementor
			) {
				type |= ContextTypeMask.IterationConditionIncreasement
			}
			else if (node === parent.statement) {
				type |= ContextTypeMask.IterationContent
			}
		}

		// `for ... in`, `for ... of`, `while ...`, `do ...`
		else if (ts.isForOfStatement(parent)
			|| ts.isForInStatement(parent)
			|| ts.isWhileStatement(parent)
			|| ts.isDoStatement(parent)
		) {
			if (node === parent.expression) {
				type |= ContextTypeMask.IterationConditionIncreasement
			}
			else if (node === parent.statement) {
				type |= ContextTypeMask.IterationContent
			}
		}

		return type
	}
	
	/** Create a context from node and push to stack. */
	export function createContext(type: ContextTypeMask, node: TS.Node): Context {
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


	/** Find an ancestral context and position, which can insert variable before it. */
	export function findClosestPositionToAddVariable(index: number, from: Context): ContextTargetPosition {
		let context = from
		let variableDeclListIndex = visiting.findOutward(index, from.visitingIndex, ts.isVariableDeclaration)
	
		// Look upward for a variable declaration.
		if (variableDeclListIndex !== undefined) {
			return {
				context,
				index: variableDeclListIndex,
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
		
		// Where to insert before.
		index = visiting.getIndex(node)
		let toIndex: number

		// For `case`, insert after expression.
		if (ts.isCaseClause(node)) {
			toIndex = visiting.getChildIndex(index, 1)!
		}
		
		// Insert before the first not import statements.
		else if (ts.isSourceFile(node)) {
			let beforeNode = node.statements.findLast(n => !ts.isImportDeclaration(n))
			if (beforeNode) {
				toIndex = visiting.getIndex(beforeNode)
			}
			else {
				toIndex = visiting.getFirstChildIndex(index)!
			}
		}
		else {
			toIndex = visiting.getFirstChildIndex(index)!
		}

		return {
			context,
			index: toIndex,
		}
	}

	/** 
	 * Find an ancestral index and context, which can move statements to before it.
	 * Must before current position, and must not cross any conditional or iteration context.
	 */
	export function findClosestPositionToAddStatement(index: number, from: Context): ContextTargetPosition {
		let context: Context | null = from
		let parameterIndex = visiting.findOutward(index, from.visitingIndex, ts.isParameter)

		// Parameter initializer, no place to insert statements, returns position itself.
		if (parameterIndex !== undefined) {
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
				
				// Can't cross these types of node, end at the inner start of it.
				if (context.type & ContextTypeMask.ConditionalContent
					|| context.type & ContextTypeMask.IterationConditionIncreasement
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
			index: visiting.getIndex(node),
		}
	}
}