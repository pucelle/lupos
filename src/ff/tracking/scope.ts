import type TS from 'typescript'
import {ObservedChecker} from './observed-checker'
import {Helper, AccessNode, ts, FlowInterruptionTypeMask, ScopeTree, VisitTree} from '../../core'
import {TrackingScopeState} from './scope-state'
import {TrackingScopeTypeMask} from './scope-tree'
import {TrackingScopeVariables} from './scope-variables'
import {TrackingCapturer} from './capturer'
import {AccessReferences} from './access-references'
import {ForceTrackType, TrackingPatch} from './patch'


/** 
 * A source file, a method, or a namespace, a function, an arrow function
 * initialize a tracking scope.
 * Otherwise, a logic or a flow statement will also initialize a tracking scope.
 */
export class TrackingScope {

	readonly type: TrackingScopeTypeMask
	readonly visitIndex: number
	readonly node: TS.Node
	readonly parent: TrackingScope | null
	readonly rangeStartNode: TS.Node | null
	readonly rangeEndNode: TS.Node | null
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
		rawNode: TS.Node,
		index: number,
		parent: TrackingScope | null,
		rangeStartNode: TS.Node | null,
		rangeEndNode: TS.Node | null
	) {
		this.type = type
		this.visitIndex = index
		this.node = rawNode
		this.parent = parent
		this.rangeStartNode = rangeStartNode
		this.rangeEndNode = rangeEndNode

		this.state = new TrackingScopeState(this)
		this.variables = new TrackingScopeVariables(this)
		this.capturer = new TrackingCapturer(this, this.state)

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
	 * Get normal scope for putting declarations.
	 * For function scope, it returns the scope of function body.
	 * Note it's not tracking scope.
	 */
	getDeclarationScope() {
		if (Helper.isFunctionLike(this.node) && this.node.body) {
			return ScopeTree.findClosestByNode(this.node.body)
		}
		else {
			return ScopeTree.findClosestByNode(this.node)
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
			this.capturer.breakCaptured(child.visitIndex, child.state.flowInterruptionType)
		}
	}

	/** 
	 * Visit scope node and each descendant node inside current scope.
	 * When visiting a node, child nodes of this node have visited.
	 */
	visitNode(node: TS.Node) {
		let index = VisitTree.getIndex(node)

		// Add parameters.
		if (ts.isParameter(node)) {
			this.variables.visitParameter(node)
		}

		// Check each variable declarations.
		else if (ts.isVariableDeclaration(node)) {
			this.variables.visitVariable(node)

			// let {a} = b
			if (node.initializer) {
				let names = Helper.variable.walkDeclarationNames(node)

				for (let {node: nameNode, keys} of names) {
					this.mayAddGetTracking(nameNode, node.initializer, keys)
				}
			}
		}

		// Test and add property access nodes.
		else if (Helper.access.isAccess(node)) {

			// `[].push`, `map.set`, `set.set`
			if (ObservedChecker.isListStructWriteAccess(node)) {
				this.mayAddSetTracking(node)
			}

			// `a.b`
			else {
				this.mayAddGetTracking(node)
			}

			AccessReferences.visitAssess(node)
		}

		// Test and add property assignment nodes.
		else if (Helper.assign.isAssignment(node)) {
			let assignTo = Helper.assign.getToExpressions(node)
			
			for (let to of assignTo) {
				if (Helper.access.isAccess(to)) {
					this.mayAddSetTracking(to)
				}
			}
		}

		// Empty `return`.
		else if (ts.isReturnStatement(node) && !node.expression) {
			this.state.unionFlowInterruptionType(FlowInterruptionTypeMask.Return)
			this.capturer.breakCaptured(this.visitIndex, FlowInterruptionTypeMask.Return)
		}

		// `break` or `continue`.
		else if (ts.isBreakOrContinueStatement(node)) {
			this.state.unionFlowInterruptionType(FlowInterruptionTypeMask.BreakLike)
			this.capturer.breakCaptured(this.visitIndex, FlowInterruptionTypeMask.BreakLike)
		}

		// Force tracking node.
		if (TrackingPatch.isIndexForceTracked(index)) {
			let type = TrackingPatch.getIndexForceTrackType(index)!
			if (type === ForceTrackType.Members) {
				this.mayAddGetTracking(node as AccessNode | TS.Identifier, node as TS.Expression, [''])
			}
			else {
				this.mayAddGetTracking(node as AccessNode | TS.Identifier)
			}
		}
	}

	/** Add a property access expression. */
	private mayAddGetTracking(node: AccessNode | TS.Identifier, exp?: TS.Expression, keys?: (string | number)[]) {
		if (this.state.shouldIgnoreGetTracking(node)) {
			return
		}

		if (!this.capturer.shouldCapture('get')) {
			return
		}

		if (ObservedChecker.isObserved(node)) {
			this.capturer.capture(node, exp, keys, 'get')
		}
	}

	/** Add a property assignment expression. */
	private mayAddSetTracking(node: AccessNode | TS.Identifier, exp?: TS.Expression, keys?: (string | number)[]) {
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
