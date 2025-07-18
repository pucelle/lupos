import * as ts from 'typescript'
import {ObservedChecker} from './observed-checker'
import {FlowInterruptionTypeMask, DeclarationScope, DeclarationScopeTree, helper} from '../../core'
import {TrackingScopeState} from './scope-state'
import {TrackingScopeTypeMask} from './scope-tree'
import {TrackingCapturer} from './capturer'
import {CapturedOutputWay, TrackingRange} from './ranges'
import {TrackingPatch} from './patch'


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
	 */
	getDeclarationScope(): DeclarationScope {
		if (helper.isFunctionLike(this.node) && this.node.body) {
			return DeclarationScopeTree.findClosest(this.node.body)
		}
		else {
			return DeclarationScopeTree.findClosest(this.node)
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
	visitNode(rawNode: ts.Node) {

		// Check each variable declarations.
		if (ts.isVariableDeclaration(rawNode)) {

			// `let {a} = b`, track `b.a`.
			if (rawNode.initializer) {
				for (let {node, initializer, keys} of helper.variable.walkDeconstructedDeclarationItems(rawNode)) {

					// Skips let `a = b`.
					if (initializer && keys.length > 0) {
						this.mayAddGetTracking(node, initializer, keys)
					}
				}
			}
		}

		// Test and add property access nodes.
		else if (helper.access.isAccess(rawNode)) {

			// `a[0]`, `map.get`, `set.get`.
			// If match call expression like `map.get(...)` should by better.
			if (helper.access.isOfElementsReadAccess(rawNode)) {
				this.mayAddGetTracking(rawNode, rawNode.expression, [''])
			}

			// `[].push`, `map.set`, `set.set`.
			else if (helper.access.isOfElementsWriteAccess(rawNode)) {
				this.mayAddSetTracking(rawNode, rawNode.expression, [''])
			}

			// `a.b`, but not `a.b` of `a.b = c`.
			else if (!helper.assign.isWithinAssignmentTo(rawNode)) {
				this.mayAddGetTracking(rawNode)
			}
		}

		// Test and add property assignment nodes.
		else if (helper.assign.isAssignment(rawNode)) {
			let assignTo = helper.assign.getToExpressions(rawNode)
			
			for (let to of assignTo) {
				if (helper.access.isAccess(to)) {
					this.mayAddSetTracking(to)
				}
			}
		}

		// Empty `return`.
		else if (ts.isReturnStatement(rawNode)) {
			if (!rawNode.expression) {
				this.state.unionFlowInterruptionType(FlowInterruptionTypeMask.Return)
				this.capturer.breakCaptured(this.node, FlowInterruptionTypeMask.Return)
			}
		}

		// `break` or `continue`.
		else if (ts.isBreakOrContinueStatement(rawNode)) {
			this.state.unionFlowInterruptionType(FlowInterruptionTypeMask.BreakLike)
			this.capturer.breakCaptured(this.node, FlowInterruptionTypeMask.BreakLike)
		}

		// `call(...)` or `new C(...)`.
		// Would be better if adding the test to `isAllElementsReadAccess` and `isAllElementsWriteAccess`,
		// But it required to look above to find closest call expression.
		else if (ts.isCallExpression(rawNode) || ts.isNewExpression(rawNode)) {
			let args = rawNode.arguments
			if (args && args.length > 0) {
				let parameters = helper.parameter.getCallParameters(rawNode)
				if (parameters && parameters.length > 0) {
					for (let {arg, typeNode} of helper.parameter.walkDeconstructedArgumentTypeItems(args, parameters)) {
						if (typeNode && (ts.isIdentifier(arg) || helper.access.isAccess(arg))) {
							let resolved = helper.symbol.resolveImport(typeNode)
							if (resolved?.moduleName === '@pucelle/lupos') {
								if (resolved.memberName === 'ParameterToObserve') {
									this.mayAddGetTracking(arg, arg, [''])
								}
								else if (resolved.memberName === 'SetOfParameterToObserve') {
									this.mayAddSetTracking(arg, arg, [''])
								}
							}
						}
					}
				}
			}
		}

		
		// `[...a]`, `{...o}`, `Object.keys(a)`
		if (helper.access.isAllElementsReadAccess(rawNode)) {
			if (ts.isIdentifier(rawNode) || helper.access.isAccess(rawNode)) {
				this.mayAddGetTracking(rawNode, rawNode, [''])
			}
		}

		// `Object.assign(a, ...)`
		else if (helper.access.isAllElementsWriteAccess(rawNode)) {
			if (ts.isIdentifier(rawNode) || helper.access.isAccess(rawNode)) {
				this.mayAddSetTracking(rawNode, rawNode, [''])
			}
		}
		
		// Custom tracking.
		if (ts.isExpression(rawNode)) {
			let customTrackingItems = TrackingPatch.getCustomTrackingItemsByNode(rawNode)
			if (customTrackingItems) {
				for (let item of customTrackingItems) {
					this.mayAddGetTracking(item.node, item.exp, item.key !== undefined ? [item.key] : undefined)
				}
			}
		}
	}

	/** 
	 * Add a property access expression.
	 * When `trackType` is `Mutable`, `exp` and `keys` must not specified
	 */
	private mayAddGetTracking(
		rawNode: ts.Expression,
		exp?: ts.Expression,
		keys?: (string | number)[]
	) {
		if (this.state.shouldIgnoreGetTracking()) {
			return
		}

		if (!this.capturer.shouldCapture('get')) {
			return
		}

		let willTrack = exp
			? ObservedChecker.getElementsObserved(exp)
			: ObservedChecker.getSelfObserved(rawNode)

		// Tracking self.
		if (willTrack) {
			this.capturer.capture(rawNode, 'get', exp, keys)
		}
	}

	/** Add a property assignment expression. */
	private mayAddSetTracking(
		rawNode: ts.Expression,
		exp?: ts.Expression,
		keys?: (string | number)[]
	) {
		if (this.state.shouldIgnoreSetTracking(rawNode)) {
			return
		}

		if (!this.capturer.shouldCapture('set')) {
			return
		}

		let willTrack = exp
			? ObservedChecker.getElementsObserved(exp)
			: ObservedChecker.getSelfObserved(rawNode)

		if (willTrack) {
			this.capturer.capture(rawNode, 'set', exp, keys)
		}
	}
}
