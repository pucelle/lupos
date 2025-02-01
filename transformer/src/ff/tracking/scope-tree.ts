import * as ts from 'typescript'
import {Packer, helper} from '../../core'
import {TrackingScope} from './scope'
import {CapturedOutputWay, TrackingRange, TrackingRanges} from './ranges'
import {ListMap} from '../../lupos-ts-module'
import {TrackingPatch} from './patch'


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

	/** `if {...}`, or binary expressions like `a && b`, `a || b`, `a ?? b`. */
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

/** Tracking scope and node position. */
export interface TrackingScopeTargetPosition{
	scope: TrackingScope
	node: ts.Node
}


export namespace TrackingScopeTree {

	let stack: (TrackingScope | null)[] = []
	
	export let current: TrackingScope | null = null

	/** Visit index -> scope list. */
	const ScopeMap: ListMap<ts.Node, TrackingScope> = new ListMap()

	/** Visit index -> scope list. */
	const SpecifiedAdditionalScopeType: Map<ts.Node, 0 | TrackingScopeTypeMask> = new Map()


	/** Initialize before visiting a new source file. */
	export function init() {
		stack = []
		current = null
		ScopeMap.clear()
		SpecifiedAdditionalScopeType.clear()
	}

	/** Specifies additional type for a node. */
	export function specifyType(node: ts.Node, additionalType: TrackingScopeTypeMask | 0) {
		SpecifiedAdditionalScopeType.set(node, additionalType)
	}


	/** Check tracking scope type of a node. */
	export function checkType(node: ts.Node): TrackingScopeTypeMask | 0 {
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
		else if (helper.isFunctionLike(node)) {
			type |= TrackingScopeTypeMask.FunctionLike

			if (helper.isInstantlyRunFunction(node) || TrackingPatch.isForceInstantlyRun(node)) {
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
		else if (Packer.getFlowInterruptionType(node) > 0) {
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

		// Add specified type.
		type |= (SpecifiedAdditionalScopeType.get(node) || 0)

		return type
	}

	/** Create a scope from node and push to stack. */
	export function createScope(type: TrackingScopeTypeMask, node: ts.Node, range: TrackingRange | null = null): TrackingScope {
		let scope = new TrackingScope(type, node, current, range)

		ScopeMap.add(node, scope)
		stack.push(current)

		if (range) {
			TrackingRanges.setScopeByRangeId(range.id, scope)
		}

		// Child `case/default` statements start a content range.
		if (ts.isCaseOrDefaultClause(node)) {
			let statements = node.statements
			if (statements.length > 0) {
				TrackingRanges.markRange(
					node,
					statements[0],
					statements[statements.length - 1],
					TrackingScopeTypeMask.CaseDefaultContent,
					CapturedOutputWay.FollowNode
				)
			}
		}

		return current = scope
	}

	/** Pop scope. */
	export function pop() {
		current!.beforeExit()
		current = stack.pop()!
	}

	/** 
	 * Visit scope node and each descendant node within current scope.
	 * Recently all child scopes have been visited.
	 */
	export function visitNode(node: ts.Node) {
		if (current) {
			current.visitNode(node)
		}
	}

	/** Find closest scope contains or equals node. */
	export function findClosest(node: ts.Node): TrackingScope {
		let scopes = ScopeMap.get(node)

		while (!scopes) {
			node = node.parent!
			scopes = ScopeMap.get(node)
		}

		return scopes[scopes.length - 1]
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
	export function findClosestPositionToAddStatements(node: ts.Node, from: TrackingScope): TrackingScopeTargetPosition {
		let scope = from
		let parameterIndex = helper.findOutwardUntil(node, from.node, ts.isParameter)

		// Parameter initializer, no place to insert statements, returns position itself.
		if (parameterIndex !== undefined) {
			return {
				scope,
				node,
			}
		}

		while (true) {

			// Can put statements ,
			// or can extend from `if()...` to `if(){...}`, insert before node.
			if (Packer.canPutStatements(node)
				|| Packer.canExtendToPutStatements(node)
			) {
				break
			}

			// `{...}`, insert before node.
			if (Packer.canPutStatements(node.parent)) {

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
			node,
		}
	}
}