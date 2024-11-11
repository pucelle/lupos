import type TS from 'typescript'
import {ObservedChecker} from './observed-checker'
import {Helper, AccessNode, ts, FlowInterruptionTypeMask, ScopeTree, VisitTree} from '../../core'
import {ContextState} from './context-state'
import {ContextTypeMask} from './context-tree'
import {ContextVariables} from './context-variables'
import {ContextCapturer} from './context-capturer'
import {AccessReferences} from './access-references'
import {ForceTrackType, TrackingPatch} from './tracking-patch'


/** 
 * A source file, a method, or a namespace, a function, an arrow function
 * create a context.
 * Otherwise, a logic or flow statement will also create a context.
 */
export class Context {

	readonly type: ContextTypeMask
	readonly visitIndex: number
	readonly node: TS.Node
	readonly parent: Context | null
	readonly rangeStartNode: TS.Node | null
	readonly rangeEndNode: TS.Node | null
	readonly children: Context[] = []
	readonly state: ContextState
	readonly variables: ContextVariables
	readonly capturer: ContextCapturer

	/** 
	 * Self or closest ancestral context, which's type is function-like,
	 * and should normally non-instantly run.
	 */
	readonly closestNonInstantlyRunFunction: Context | null

	constructor(
		type: ContextTypeMask,
		rawNode: TS.Node,
		index: number,
		parent: Context | null,
		rangeStartNode: TS.Node | null,
		rangeEndNode: TS.Node | null
	) {
		this.type = type
		this.visitIndex = index
		this.node = rawNode
		this.parent = parent
		this.rangeStartNode = rangeStartNode
		this.rangeEndNode = rangeEndNode

		this.state = new ContextState(this)
		this.variables = new ContextVariables(this)
		this.capturer = new ContextCapturer(this, this.state)

		let beNonInstantlyRunFunction = (type & ContextTypeMask.FunctionLike)
			&& (type & ContextTypeMask.InstantlyRunFunction) === 0
		
		this.closestNonInstantlyRunFunction = beNonInstantlyRunFunction
			? this
			: parent?.closestNonInstantlyRunFunction ?? null

		if (parent) {
			parent.enterChild(this)
		}
	}

	/** 
	 * Get scope for putting declarations.
	 * For function context, it returns the scope of function body.
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
	 * Call after children contexts are ready,
	 * and current context will exit.
	 */
	beforeExit() {
		this.capturer.beforeExit()

		if (this.parent) {
			this.parent.leaveChild(this)
		}
	}

	/** Enter a child context. */
	enterChild(child: Context) {
		this.children.push(child)
	}

	/** Leave a child context. */
	leaveChild(child: Context) {
		this.state.mergeChildContext(child)

		if (child.state.isFlowInterrupted()) {
			this.capturer.breakCaptured(child.visitIndex, child.state.flowInterruptionType)
		}
	}

	/** 
	 * Visit context node and each descendant node inside current context.
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
