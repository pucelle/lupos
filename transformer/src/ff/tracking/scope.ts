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

			// `let {a} = b`, track `b.a`.
			if (node.initializer) {
				let names = helper.variable.walkDeclarationNames(node)

				for (let {node: nameNode, keys} of names) {
					this.mayAddGetTracking(nameNode, false, node.initializer, keys)
				}
			}
		}

		// Test and add property access nodes.
		else if (helper.access.isAccess(node)) {

			// `[].push`, `map.set`, `set.set`.
			if (helper.access.isOfElementsWriteAccess(node)) {
				this.mayAddSetTracking(node)
			}

			// `a.b`, but not `a.b` of `a.b = c`.
			else if (!helper.assign.isWithinAssignmentTo(node)) {
				this.mayAddGetTracking(node)
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
		else if (ts.isReturnStatement(node)) {
			if (!node.expression) {
				this.state.unionFlowInterruptionType(FlowInterruptionTypeMask.Return)
				this.capturer.breakCaptured(this.node, FlowInterruptionTypeMask.Return)
			}
		}

		// `break` or `continue`.
		else if (ts.isBreakOrContinueStatement(node)) {
			this.state.unionFlowInterruptionType(FlowInterruptionTypeMask.BreakLike)
			this.capturer.breakCaptured(this.node, FlowInterruptionTypeMask.BreakLike)
		}

		
		// `[...a]`, `{...o}`, `Object.keys(a)`
		if (helper.access.isAllElementsReadAccess(node)) {
			if (ts.isIdentifier(node) || helper.access.isAccess(node)) {
				this.mayAddGetTracking(node, true, node, [''])
			}
		}

		// `Object.assign(a, ...)`
		else if (helper.access.isAllElementsWriteAccess(node)) {
			if (ts.isIdentifier(node) || helper.access.isAccess(node)) {
				this.mayAddSetTracking(node, true, node, [''])
			}
		}
	}

	/** Add a property access expression. */
	private mayAddGetTracking(
		node: AccessNode | ts.Identifier,
		visitElements: boolean = false,
		exp?: ts.Expression,
		keys?: (string | number)[]
	) {
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

		// Force tracking elements.
		let type = TrackingPatch.getForceTrackType(node)
		if (type === ForceTrackType.Elements) {
			this.capturer.capture(node, node as ts.Expression, [''], 'get')
		}
	}

	/** Add a property assignment expression. */
	private mayAddSetTracking(node: AccessNode | ts.Identifier,
		visitElements: boolean = false,
		exp?: ts.Expression,
		keys?: (string | number)[]
	) {
		if (this.state.shouldIgnoreSetTracking(node)) {
			return
		}

		if (!this.capturer.shouldCapture('set')) {
			return
		}

		if (ObservedChecker.isObserved(node, visitElements)) {
			this.capturer.capture(node, exp, keys, 'set')
		}
	}
}
