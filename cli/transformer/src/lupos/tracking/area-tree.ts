import * as ts from 'typescript'
import {Packer, helper} from '../../core'
import {TrackingArea} from './area'
import {CapturedOutputWay, TrackingRange, TrackingRanges} from './ranges'
import {ListMap} from '../../lupos-ts-module'
import {TrackingPatch} from './patch'


export enum TrackingAreaTypeMask {

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
	 * An area with `Range` must have `rangeStartNode` and `rangeEndNode` nodes.
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

	/** 
	 * `return`, `break`, `continue`, `yield `, `await`, and with content.
	 * () => content, content also have this flag.
	 */
	FlowInterruption = 2 ** 19,
}

/** Tracking area and node position. */
export interface TrackingAreaTargetPosition{
	area: TrackingArea
	toNode: ts.Node
}


export namespace TrackingAreaTree {

	let stack: (TrackingArea | null)[] = []
	
	export let current: TrackingArea | null = null

	/** Visit index -> area list. */
	const AreaMap: ListMap<ts.Node, TrackingArea> = new ListMap()

	/** Visit index -> area list. */
	const SpecifiedAdditionalAreaType: Map<ts.Node, 0 | TrackingAreaTypeMask> = new Map()


	/** Initialize before visiting a new source file. */
	export function init() {
		stack = []
		current = null
		AreaMap.clear()
		SpecifiedAdditionalAreaType.clear()
	}

	/** Specifies additional type for a node. */
	export function specifyType(node: ts.Node, additionalType: TrackingAreaTypeMask | 0) {
		SpecifiedAdditionalAreaType.set(node, additionalType)
	}


	/** Check tracking area type of a node. */
	export function checkType(node: ts.Node): TrackingAreaTypeMask | 0 {
		let parent = node.parent
		let type = 0

		// Source file
		if (ts.isSourceFile(node)) {
			type |= TrackingAreaTypeMask.SourceFile
		}

		// Class
		else if (ts.isClassLike(node)) {
			type |= TrackingAreaTypeMask.Class
		}

		// Function like
		else if (helper.isFunctionLike(node)) {
			type |= TrackingAreaTypeMask.FunctionLike

			if (helper.isInstantlyRunFunction(node) || TrackingPatch.isForceInstantlyRun(node)) {
				type |= TrackingAreaTypeMask.InstantlyRunFunction
			}
		}

		// For `if...else if...`
		else if (ts.isIfStatement(node)) {
			type |= TrackingAreaTypeMask.Conditional
		}

		// `a ? b : c`
		else if (ts.isConditionalExpression(node)) {
			type |= TrackingAreaTypeMask.Conditional
		}

		//  `a && b`, `a || b`, `a ?? b`
		else if (ts.isBinaryExpression(node)
			&& (
				node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
				|| node.operatorToken.kind === ts.SyntaxKind.BarBarToken
				|| node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
			)
		) {
			type |= TrackingAreaTypeMask.Conditional
		}

		// `switch(...) {...}`
		else if (ts.isSwitchStatement(node)) {
			type |= TrackingAreaTypeMask.Switch
		}

		// `case ...`, `default ...`.
		else if (ts.isCaseOrDefaultClause(node)) {
			type |= TrackingAreaTypeMask.CaseDefault
		}

		// Iteration
		else if (ts.isForOfStatement(node)
			|| ts.isForInStatement(node)
			|| ts.isForStatement(node)
			|| ts.isWhileStatement(node)
			|| ts.isDoStatement(node)
		) {
			type |= TrackingAreaTypeMask.Iteration
		}

		// Flow stop, and has content.
		// `break` and `continue` contains no expressions, so should not be a area type.
		// Or default-returned content of arrow function `() => content`
		if (Packer.getFlowInterruptionType(node) > 0) {
			type |= TrackingAreaTypeMask.FlowInterruption
		}


		if (!parent) {
			return type
		}

		// `if (...) ...`
		if (ts.isIfStatement(parent)) {
			if (node === parent.expression) {
				type |= TrackingAreaTypeMask.ConditionalCondition
			}
			else if (node === parent.thenStatement || node === parent.elseStatement) {
				type |= TrackingAreaTypeMask.ConditionalContent
			}
		}

		// `a ? b : c`
		else if (ts.isConditionalExpression(parent)) {
			if (node === parent.condition) {
				type |= TrackingAreaTypeMask.ConditionalCondition
			}
			else if (node === parent.whenTrue || node === parent.whenFalse) {
				type |= TrackingAreaTypeMask.ConditionalContent
			}
		}

		// `a && b`, `a || b`, `a ?? b`.
		else if (ts.isBinaryExpression(parent)) {
			if ((parent.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
				|| parent.operatorToken.kind === ts.SyntaxKind.BarBarToken
				|| parent.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken)
			) {
				if (node === parent.left) {
					type |= TrackingAreaTypeMask.ConditionalCondition
				}
				else if (node === parent.right) {
					type |= TrackingAreaTypeMask.ConditionalContent
				}
			}
		}

		// `for (;;) ...`
		else if (ts.isForStatement(parent)) {
			if (node === parent.initializer) {
				type |= TrackingAreaTypeMask.IterationInitializer
			}
			else if (node === parent.condition) {
				type |= TrackingAreaTypeMask.IterationCondition
			}
			else if (node === parent.incrementor) {
				type |= TrackingAreaTypeMask.IterationIncreasement
			}
			else if (node === parent.statement) {
				type |= TrackingAreaTypeMask.IterationContent
			}
		}

		// `for ... in`, `for ... of`
		else if (ts.isForOfStatement(parent)
			|| ts.isForInStatement(parent)
		) {
			if (node === parent.initializer) {
				type |= TrackingAreaTypeMask.IterationInitializer
			}
			else if (node === parent.expression) {
				type |= TrackingAreaTypeMask.IterationExpression
			}
			else if (node === parent.statement) {
				type |= TrackingAreaTypeMask.IterationContent
			}
		}

		// `while ...`, `do ...`
		else if (ts.isWhileStatement(parent)
			|| ts.isDoStatement(parent)
		) {
			if (node === parent.expression) {
				type |= TrackingAreaTypeMask.IterationExpression
			}
			else if (node === parent.statement) {
				type |= TrackingAreaTypeMask.IterationContent
			}
		}

		// `switch (...) ...`
		else if (ts.isSwitchStatement(parent)) {
			if (node === parent.expression) {
				type |= TrackingAreaTypeMask.SwitchCondition
			}
		}

		// `case (...) ...`
		else if (ts.isCaseClause(parent)) {
			if (node === parent.expression) {
				type |= TrackingAreaTypeMask.CaseCondition
			}
		}

		// Add specified type.
		type |= (SpecifiedAdditionalAreaType.get(node) || 0)

		return type
	}

	/** Create an area from node and push to stack. */
	export function createArea(type: TrackingAreaTypeMask, node: ts.Node, range: TrackingRange | null = null): TrackingArea {
		let area = new TrackingArea(type, node, current, range)

		AreaMap.add(node, area)
		stack.push(current)

		if (range) {
			TrackingRanges.setAreaByRangeId(range.id, area)
		}

		// Child `case/default` statements start a content range.
		if (ts.isCaseOrDefaultClause(node)) {
			let statements = node.statements
			if (statements.length > 0) {
				TrackingRanges.markRange(
					node,
					statements[0],
					statements[statements.length - 1],
					TrackingAreaTypeMask.CaseDefaultContent,
					CapturedOutputWay.FollowNode
				)
			}
		}

		return current = area
	}

	/** Pop area. */
	export function pop() {
		current!.beforeExit()
		current = stack.pop()!
	}

	/** 
	 * Visit area node and each descendant node within current area.
	 * Recently all child areas have been visited.
	 */
	export function visitNode(node: ts.Node) {
		if (current) {
			current.visitNode(node)
		}
	}



	/** Returns whether area with type may run or not run. */
	export function mayRunOrNot(type: TrackingAreaTypeMask): boolean {
		return (type & (
			TrackingAreaTypeMask.ConditionalContent
			| TrackingAreaTypeMask.IterationIncreasement
			| TrackingAreaTypeMask.IterationContent
			| TrackingAreaTypeMask.CaseDefaultContent
		)) > 0
	}

	/** Get area by node. */
	export function get(node: ts.Node): TrackingArea | undefined {
		let areas = AreaMap.get(node)
		return areas?.[areas.length - 1]
	}

	/** Find closest area contains or equals node. */
	export function findClosest(node: ts.Node): TrackingArea {
		let areas = AreaMap.get(node)

		while (!areas) {
			node = node.parent!
			areas = AreaMap.get(node)
		}

		return areas[areas.length - 1]
	}

	/** 
	 * Walk area itself and descendants.
	 * Always walk descendants before self.
	 */
	export function* walkInwardChildFirst(area: TrackingArea, filter?: (area: TrackingArea) => boolean): Iterable<TrackingArea> {
		if (!filter || filter(area)) {
			for (let child of area.children) {
				yield* walkInwardChildFirst(child, filter)
			}
	
			yield area
		}
	}

	/** 
	 * Walk area itself and descendants.
	 * Always walk descendants after self.
	 */
	export function* walkInwardSelfFirst(area: TrackingArea, filter?: (area: TrackingArea) => boolean): Iterable<TrackingArea> {
		if (!filter || filter(area)) {
			yield area
		
			for (let child of area.children) {
				yield* walkInwardSelfFirst(child, filter)
			}
		}
	}


	/** 
	 * Find an ancestral index and area, which can add statements to before it.
	 * If current position can add statements, return current position.
	 * Must before current position, and must not cross any conditional or iteration area.
	 */
	export function findClosestPositionToAddStatements(fromNode: ts.Node, from: TrackingArea): TrackingAreaTargetPosition {
		let area = from
		let toNode = fromNode

		while (true) {

			// Can put statements ,
			// or can extend from `if()...` to `if(){...}`, insert before node.
			if (Packer.canPutStatements(toNode)
				|| Packer.canExtendToPutStatements(toNode)
			) {
				break
			}

			// `{...}`, insert before toNode.
			if (Packer.canPutStatements(toNode.parent)) {

				// area of toNode.parent.
				if (toNode === area.node) {
					area = area.parent!
				}
				break
			}

			// To outer area.
			if (toNode === area.node) {
				
				// Can't cross these types of areas, will end at the inner start of them.
				if (area.type & (
					TrackingAreaTypeMask.ConditionalContent
					| TrackingAreaTypeMask.IterationCondition
					| TrackingAreaTypeMask.IterationIncreasement
					| TrackingAreaTypeMask.IterationExpression
					| TrackingAreaTypeMask.IterationContent
				)) {
					break
				}

				area = area.parent!
			}

			toNode = toNode.parent
		}

		return {
			area,
			toNode,
		}
	}
}