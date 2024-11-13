import type TS from 'typescript'
import {Helper, ts, VisitTree} from '../../core'
import {TrackingScope} from './scope'
import {CapturedOutputWay} from './capturer'
import {ListMap} from '../../utils'


export enum TrackingScopeTypeMask {

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

	/** `if`, or binary expressions like `a && b`, `a || b`, `a ?? b`. */
	Conditional = 2 ** 4,

	/** 
	 * Condition of  `if (...)`,
	 * or left part of binary expressions like `a && b`, `a || b`, `a ?? b`.
	 */
	ConditionalCondition = 2 ** 5,

	/** 
	 * Content of `if`, `else`,
	 * or right part of binary expressions like `a && b`, `a || b`, `a ?? b`.
	 */
	ConditionalContent = 2 ** 6,

	/** `switch`. */
	Switch = 2 ** 7,

	/** Condition of `switch ...`. */
	SwitchCondition = 2 ** 8,

	/** `case` or `default`. */
	CaseDefault = 2 ** 9,

	/** Condition of `case ...`. */
	CaseCondition = 2 ** 10,

	/** Content of `case xxx ...`, `default ...`. */
	CaseDefaultContent = 2 ** 11,

	/** 
	 * Like content of `case xxx: ...`, `default ...`,
	 * or a specified range to contain partial of a template literal.
	 * A scope with `Range` must have `rangeStartNode` and `rangeEndNode` nodes.
	 * And `node` is the container node contains both `rangeStartNode` and `rangeEndNode` nodes.
	 */
	Range = 2 ** 12,

	/** Process For iteration initializer, condition, incrementor. */
	Iteration = 2 ** 13,

	/** `for (let...)` */
	IterationInitializer = 2 ** 14,

	/** `while (...)`, `for (; ...; )` */
	IterationCondition = 2 ** 15,

	/** `for (; ; ...)` */
	IterationIncreasement = 2 ** 16,

	/** `for (let xxx of ...)` */
	IterationExpression = 2 ** 17,

	/** 
	 * `while () ...`, `for () ...`, May run for none, 1 time, multiple times.
	 * Content itself can be a block, or a normal expression.
	 */
	IterationContent = 2 ** 18,

	/** `return`, `break`, `continue`, `yield `, `await`, and with content. */
	FlowInterruption = 2 ** 19,
}

/** Tracking scope and a visit index position. */
export interface TrackingScopeTargetPosition{
	scope: TrackingScope
	index: number
}

/** Describe a tracking range. */
interface TrackingRange {
	node: TS.Node
	startNode: TS.Node
	endNode: TS.Node
	outputWay: CapturedOutputWay
}


export namespace TrackingScopeTree {

	let stack: (TrackingScope | null)[] = []
	
	export let current: TrackingScope | null = null

	/** Visit index -> scope list. */
	const ScopeMap: ListMap<number, TrackingScope> = new ListMap()

	/** All content ranges. */
	let ranges: TrackingRange[] = []

	/** Range start node -> scope. */
	const RangeStartNodeMap: Map<TS.Node, TrackingScope> = new Map()


	/** Initialize before visiting a new source file. */
	export function init() {
		stack = []
		current = null
		ranges = []
		ScopeMap.clear()
		RangeStartNodeMap.clear()
	}


	/** 
	 * Mark a scope by node range, later will be made as a `Range` scope.
	 * Note must mark before scope visitor visit it.
	 */
	export function markRange(node: TS.Node, startNode: TS.Node, endNode: TS.Node, outputWay: CapturedOutputWay) {
		ranges.push({node, startNode, endNode, outputWay})
	}

	/** Try get a content range by start node. */
	export function getRangeByStartNode(startNode: TS.Node): TrackingRange | undefined {
		let range = ranges.find(r => r.startNode === startNode)
		return range
	}

	/** Remove a content range by start node. */
	export function removeRangeByStartNode(startNode: TS.Node) {
		let rangeIndex = ranges.findIndex(r => r.startNode === startNode)
		if (rangeIndex > -1) {
			ranges.splice(rangeIndex, 1)
		}
	}

	/** Get tracking scope by range start node. */
	export function getRangeScopeByStartNode(startNode: TS.Node): TrackingScope | undefined {
		return RangeStartNodeMap.get(startNode)
	}


	/** Check tracking scope type of a node. */
	export function checkType(node: TS.Node): TrackingScopeTypeMask | 0 {
		let parent = node.parent
		let type = 0

		// Source file
		if (ts.isSourceFile(node)) {
			type |= TrackingScopeTypeMask.SourceFile
		}

		// Class
		else if (ts.isClassLike(node)) {
			type |= TrackingScopeTypeMask.Class
		}

		// Function like
		else if (Helper.isFunctionLike(node)) {
			type |= TrackingScopeTypeMask.FunctionLike

			if (Helper.isInstantlyRunFunction(node)) {
				type |= TrackingScopeTypeMask.InstantlyRunFunction
			}
		}

		// For `if...else if...`
		else if (ts.isIfStatement(node)) {
			type |= TrackingScopeTypeMask.Conditional
		}

		// `a ? b : c`
		else if (ts.isConditionalExpression(node)) {
			type |= TrackingScopeTypeMask.Conditional
		}

		//  `a && b`, `a || b`, `a ?? b`
		else if (ts.isBinaryExpression(node)
			&& (
				node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
				|| node.operatorToken.kind === ts.SyntaxKind.BarBarToken
				|| node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
			)
		) {
			type |= TrackingScopeTypeMask.Conditional
		}

		// `switch(...) {...}`
		else if (ts.isSwitchStatement(node)) {
			type |= TrackingScopeTypeMask.Switch
		}

		// `case ...`, `default ...`.
		else if (ts.isCaseOrDefaultClause(node)) {
			type |= TrackingScopeTypeMask.CaseDefault
		}

		// Iteration
		else if (ts.isForOfStatement(node)
			|| ts.isForInStatement(node)
			|| ts.isForStatement(node)
			|| ts.isWhileStatement(node)
			|| ts.isDoStatement(node)
		) {
			type |= TrackingScopeTypeMask.Iteration
		}

		// Flow stop, and has content.
		// `break` and `continue` contains no expressions, so should not be a scope type.
		else if (Helper.pack.getFlowInterruptionType(node) > 0) {
			type |= TrackingScopeTypeMask.FlowInterruption
		}


		if (!parent) {
			return type
		}

		// `if (...) ...`
		if (ts.isIfStatement(parent)) {
			if (node === parent.expression) {
				type |= TrackingScopeTypeMask.ConditionalCondition
			}
			else if (node === parent.thenStatement || node === parent.elseStatement) {
				type |= TrackingScopeTypeMask.ConditionalContent
			}
		}

		// `a ? b : c`
		else if (ts.isConditionalExpression(parent)) {
			if (node === parent.condition) {
				type |= TrackingScopeTypeMask.ConditionalCondition
			}
			else if (node === parent.whenTrue || node === parent.whenFalse) {
				type |= TrackingScopeTypeMask.ConditionalContent
			}
		}

		// `a && b`, `a || b`, `a ?? b`.
		else if (ts.isBinaryExpression(parent)) {
			if ((parent.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
				|| parent.operatorToken.kind === ts.SyntaxKind.BarBarToken
				|| parent.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken)
			) {
				if (node === parent.left) {
					type |= TrackingScopeTypeMask.ConditionalCondition
				}
				else if (node === parent.right) {
					type |= TrackingScopeTypeMask.ConditionalContent
				}
			}
		}

		// `for (;;) ...`
		else if (ts.isForStatement(parent)) {
			if (node === parent.initializer) {
				type |= TrackingScopeTypeMask.IterationInitializer
			}
			else if (node === parent.condition) {
				type |= TrackingScopeTypeMask.IterationCondition
			}
			else if (node === parent.incrementor) {
				type |= TrackingScopeTypeMask.IterationIncreasement
			}
			else if (node === parent.statement) {
				type |= TrackingScopeTypeMask.IterationContent
			}
		}

		// `for ... in`, `for ... of`
		else if (ts.isForOfStatement(parent)
			|| ts.isForInStatement(parent)
		) {
			if (node === parent.initializer) {
				type |= TrackingScopeTypeMask.IterationInitializer
			}
			else if (node === parent.expression) {
				type |= TrackingScopeTypeMask.IterationExpression
			}
			else if (node === parent.statement) {
				type |= TrackingScopeTypeMask.IterationContent
			}
		}

		// `while ...`, `do ...`
		else if (ts.isWhileStatement(parent)
			|| ts.isDoStatement(parent)
		) {
			if (node === parent.expression) {
				type |= TrackingScopeTypeMask.IterationExpression
			}
			else if (node === parent.statement) {
				type |= TrackingScopeTypeMask.IterationContent
			}
		}

		// `switch (...) ...`
		else if (ts.isSwitchStatement(parent)) {
			if (node === parent.expression) {
				type |= TrackingScopeTypeMask.SwitchCondition
			}
		}

		// `case (...) ...`
		else if (ts.isCaseClause(parent)) {
			if (node === parent.expression) {
				type |= TrackingScopeTypeMask.CaseCondition
			}
		}

		return type
	}

	/** Check range content scope type of a node. */
	export function checkRangedType(node: TS.Node): TrackingScopeTypeMask | 0 {
		let parent = node.parent
		let type = 0

		// Make a content range.
		if (getRangeByStartNode(node)) {
			type |= TrackingScopeTypeMask.Range

			// Content of case or default.
			if (ts.isCaseOrDefaultClause(parent)) {
				type |= TrackingScopeTypeMask.CaseDefaultContent
			}
		}

		return type
	}

	/** Create a scope from node and push to stack. */
	export function createScope(type: TrackingScopeTypeMask, node: TS.Node): TrackingScope {
		let index = VisitTree.getIndex(node)
		let startNode = null
		let endNode = null
		let outputWay = CapturedOutputWay.FollowNode

		// Initialize content range.
		if (type & TrackingScopeTypeMask.Range) {
			let range = getRangeByStartNode(node)
			if (range) {
				startNode = range.startNode
				endNode = range.endNode
				outputWay = range.outputWay
			}
		}

		let scope = new TrackingScope(type, node, index, current, startNode, endNode, outputWay)

		ScopeMap.add(index, scope)
		stack.push(current)

		if (startNode) {
			RangeStartNodeMap.set(startNode, scope)
		}

		// Child `case/default` statements start a content range.
		if (ts.isCaseOrDefaultClause(node)) {
			let statements = node.statements
			if (statements.length > 0) {
				markRange(node, statements[0], statements[statements.length - 1], CapturedOutputWay.FollowNode)
			}
		}

		return current = scope
	}

	/** Pop scope. */
	export function pop() {
		if (current && (current.type & TrackingScopeTypeMask.Range)) {
			removeRangeByStartNode(current.rangeStartNode!)
		}

		current!.beforeExit()
		current = stack.pop()!
	}

	/** 
	 * Visit scope node and each descendant node within current scope.
	 * Recently all child scopes have been visited.
	 */
	export function visitNode(node: TS.Node) {
		if (current) {
			current.visitNode(node)
		}
	}


	/** 
	 * Find closest scope contains or equals node with specified visit index.
	 * Note it's not fit for finding `Range` type of scopes.
	 */
	export function findClosest(index: number): TrackingScope {
		let scopes = ScopeMap.get(index)

		while (!scopes) {
			index = VisitTree.getParentIndex(index)!
			scopes = ScopeMap.get(index)
		}

		return scopes[scopes.length - 1]
	}

	/** Find closest scope contains or equals node. */
	export function findClosestByNode(node: TS.Node): TrackingScope {
		return findClosest(VisitTree.getIndex(node))
	}

	/** 
	 * Walk scope itself and descendants.
	 * Always walk descendants before self.
	 */
	export function* walkInwardChildFirst(scope: TrackingScope, filter?: (scope: TrackingScope) => boolean): Iterable<TrackingScope> {
		if (!filter || filter(scope)) {
			for (let child of scope.children) {
				yield* walkInwardChildFirst(child, filter)
			}
	
			yield scope
		}
	}

	/** 
	 * Walk scope itself and descendants.
	 * Always walk descendants after self.
	 */
	export function* walkInwardSelfFirst(scope: TrackingScope, filter?: (scope: TrackingScope) => boolean): Iterable<TrackingScope> {
		if (!filter || filter(scope)) {
			yield scope
		
			for (let child of scope.children) {
				yield* walkInwardSelfFirst(child, filter)
			}
		}
	}


	/** 
	 * Find an ancestral index and scope, which can add statements to before it.
	 * If current position can add statements, return current position.
	 * Must before current position, and must not cross any conditional or iteration scope.
	 */
	export function findClosestPositionToAddStatements(index: number, from: TrackingScope): TrackingScopeTargetPosition {
		let scope = from
		let parameterIndex = VisitTree.findOutwardMatch(index, from.visitIndex, ts.isParameter)

		// Parameter initializer, no place to insert statements, returns position itself.
		if (parameterIndex !== undefined) {
			return {
				scope,
				index,
			}
		}

		let node = VisitTree.getNode(index)

		while (true) {

			// Can put statements ,
			// or can extend from `if()...` to `if(){...}`, insert before node.
			if (Helper.pack.canPutStatements(node)
				|| Helper.pack.canExtendToPutStatements(node)
			) {
				break
			}

			// `{...}`, insert before node.
			if (Helper.pack.canPutStatements(node.parent)) {

				// scope of node.parent.
				if (node === scope.node) {
					scope = scope.parent!
				}
				break
			}

			// To outer scope.
			if (node === scope.node) {
				
				// Can't across these types of scope, will end at the inner start of them.
				if (scope.type & TrackingScopeTypeMask.ConditionalContent
					|| scope.type & TrackingScopeTypeMask.IterationCondition
					|| scope.type & TrackingScopeTypeMask.IterationIncreasement
					|| scope.type & TrackingScopeTypeMask.IterationExpression
					|| scope.type & TrackingScopeTypeMask.IterationContent
				) {
					break
				}

				scope = scope.parent!
			}

			node = node.parent
		}

		return {
			scope,
			index: VisitTree.getIndex(node),
		}
	}
}