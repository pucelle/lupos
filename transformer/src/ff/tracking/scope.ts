import * as ts from 'typescript'
import {ObservedChecker} from './observed-checker'
import {FlowInterruptionTypeMask, VariableScopeTree, helper} from '../../core'
import {AccessNode} from '../../lupos-ts-module'
import {TrackingScopeState} from './scope-state'
import {TrackingScopeTypeMask} from './scope-tree'
import {TrackingScopeVariables} from './scope-variables'
import {TrackingCapturer} from './capturer'
import {AccessReferences} from './access-references'
import {ForceTrackType, TrackingPatch} from './patch'
import {CapturedOutputWay, TrackingRange} from './ranges'


/** 
 * A source file, a method, or a namespace, a function, an arrow function
 * initialize a tracking scope.
 * Otherwise, a logic or a flow statement will also initialize a tracking scope.
 */
export class TrackingScope {

	readonly type: TrackingScopeTypeMask
	readonly node: ts.Node
	readonly parent: TrackingScope | null
	readonly range: TrackingRange | null
	readonly children: TrackingScope[] = []
	readonly state: TrackingScopeState
	readonly variables: TrackingScopeVariables
	readonly capturer: TrackingCapturer

	/** 
	 * Self or closest ancestral scope, which's type is function-like,
	 * and should normally non-instantly run.
	 */
	readonly closestNonInstantlyRunFunction: TrackingScope | null

	constructor(
		type: TrackingScopeTypeMask,
		rawNode: ts.Node,
		parent: TrackingScope | null,
		range: TrackingRange | null
	) {
		this.type = type
		this.node = rawNode
		this.parent = parent
		this.range = range

		this.state = new TrackingScopeState(this)
		this.variables = new TrackingScopeVariables(this)
		this.capturer = new TrackingCapturer(this, this.state, range?.outputWay ?? CapturedOutputWay.FollowNode)

		let beNonInstantlyRunFunction = (type & TrackingScopeTypeMask.FunctionLike)
			&& (type & TrackingScopeTypeMask.InstantlyRunFunction) === 0
		
		this.closestNonInstantlyRunFunction = beNonInstantlyRunFunction
			? this
			: parent?.closestNonInstantlyRunFunction ?? null

		if (parent) {
			parent.enterChild(this)
		}
	}

	/** 
	 * Get declaration scope for putting declarations.
	 * For function scope, it returns the scope of function body.
	 * Note it's not tracking scope.
	 */
	getDeclarationScope() {
		if (helper.isFunctionLike(this.node) && this.node.body) {
			return VariableScopeTree.findClosest(this.node.body)
		}
		else {
			return VariableScopeTree.findClosest(this.node)
		}
	}

	/** 
	 * Call after children scopes are ready,
	 * and current scope will exit.
	 */
	beforeExit() {
		this.capturer.beforeExit()

		if (this.parent) {
			this.parent.leaveChild(this)
		}
	}

	/** Enter a child scope. */
	enterChild(child: TrackingScope) {
		this.children.push(child)
	}

	/** Leave a child scope. */
	leaveChild(child: TrackingScope) {
		this.state.mergeChildScope(child)

		if (child.state.isFlowInterrupted()) {
			this.capturer.breakCaptured(child.node, child.state.flowInterruptionType)
		}
	}

	/** 
	 * Visit scope node and each descendant node inside current scope.
	 * When visiting a node, child nodes of this node have visited.
	 */
	visitNode(node: ts.Node) {

		// Add parameters.
		if (ts.isParameter(node)) {
			this.variables.visitParameter(node)
		}

		// Check each variable declarations.
		else if (ts.isVariableDeclaration(node)) {
			this.variables.visitVariable(node)

			// let {a} = b
			if (node.initializer) {
				let names = helper.variable.walkDeclarationNames(node)

				for (let {node: nameNode, keys} of names) {
					this.mayAddGetTracking(nameNode, false, node.initializer, keys)
				}
			}
		}

		// `[...a]`, `{...o}`
		else if (node.parent
			&& (ts.isSpreadAssignment(node.parent)
				|| ts.isSpreadElement(node.parent)
			)
			&& (ts.isIdentifier(node) || helper.access.isAccess(node))
		) {
			this.mayAddGetTracking(node, true, node, [''])
		}

		// Test and add property access nodes.
		else if (helper.access.isAccess(node)) {

			// `[].push`, `map.set`, `set.set`
			if (helper.access.isElementsWriteAccess(node)) {
				this.mayAddSetTracking(node)
			}

			// `a.b`
			else {
				this.mayAddGetTracking(node, false)
			}

			AccessReferences.visitAssess(node)
		}

		// Test and add property assignment nodes.
		else if (helper.assign.isAssignment(node)) {
			let assignTo = helper.assign.getToExpressions(node)
			
			for (let to of assignTo) {
				if (helper.access.isAccess(to)) {
					this.mayAddSetTracking(to)
				}
			}
		}

		// Empty `return`.
		else if (ts.isReturnStatement(node) && !node.expression) {
			this.state.unionFlowInterruptionType(FlowInterruptionTypeMask.Return)
			this.capturer.breakCaptured(this.node, FlowInterruptionTypeMask.Return)
		}

		// `break` or `continue`.
		else if (ts.isBreakOrContinueStatement(node)) {
			this.state.unionFlowInterruptionType(FlowInterruptionTypeMask.BreakLike)
			this.capturer.breakCaptured(this.node, FlowInterruptionTypeMask.BreakLike)
		}
	}

	/** Add a property access expression. */
	private mayAddGetTracking(node: AccessNode | ts.Identifier, visitElements: boolean, exp?: ts.Expression, keys?: (string | number)[]) {
		if (this.state.shouldIgnoreGetTracking(node)) {
			return
		}

		if (!this.capturer.shouldCapture('get')) {
			return
		}

		// Normal tracking.
		if (ObservedChecker.isObserved(node, visitElements)) {
			this.capturer.capture(node, exp, keys, 'get')
		}

		// Force tracking.
		let type = TrackingPatch.getForceTrackType(node)
		if (type === ForceTrackType.Elements) {
			this.capturer.capture(node, node as ts.Expression, [''], 'get')
		}
	}

	/** Add a property assignment expression. */
	private mayAddSetTracking(node: AccessNode | ts.Identifier, exp?: ts.Expression, keys?: (string | number)[]) {
		if (this.state.shouldIgnoreSetTracking(node)) {
			return
		}

		if (!this.capturer.shouldCapture('set')) {
			return
		}

		if (ObservedChecker.isObserved(node)) {
			this.capturer.capture(node, exp, keys, 'set')
		}
	}
}
