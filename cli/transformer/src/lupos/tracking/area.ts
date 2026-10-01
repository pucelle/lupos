import ts from 'typescript'
import {ObservedChecker} from './observed-checker'
import {DeclarationScope, DeclarationScopeTree, transformContext} from '../../core'
import {TrackingAreaState} from './area-state'
import {TrackingAreaTypeMask} from './area-tree'
import {isDirectAccessCaptured, TrackingCapturer} from './capturer'
import {TrackingRange} from './ranges'
import {TrackingPatch} from './patch'
import {FlowInterruptionTypeMask} from './helper'
import {AccessNode} from '../../lupos-ts-module'


/** 
 * A source file, a method, or a namespace, a function, an arrow function
 * initialize a tracking area.
 * Otherwise, a logic or a flow statement will also initialize a tracking area.
 */
export class TrackingArea {

	readonly type: TrackingAreaTypeMask
	readonly node: ts.Node
	readonly parent: TrackingArea | null
	readonly range: TrackingRange | null
	readonly children: TrackingArea[] = []
	readonly state: TrackingAreaState
	readonly capturer: TrackingCapturer

	/** 
	 * Self or closest ancestral area, which's type is function-like,
	 * and should normally non-instantly run.
	 */
	readonly closestNonInstantlyRunFunction: TrackingArea | null

	constructor(
		type: TrackingAreaTypeMask,
		rawNode: ts.Node,
		parent: TrackingArea | null,
		range: TrackingRange | null
	) {
		this.type = type
		this.node = rawNode
		this.parent = parent
		this.range = range

		this.state = new TrackingAreaState(this)
		this.capturer = new TrackingCapturer(this, this.state)

		let beNonInstantlyRunFunction = (type & TrackingAreaTypeMask.FunctionLike)
			&& (type & TrackingAreaTypeMask.InstantlyRunFunction) === 0
		
		this.closestNonInstantlyRunFunction = beNonInstantlyRunFunction
			? this
			: parent?.closestNonInstantlyRunFunction ?? null

		if (parent) {
			parent.enterChild(this)
		}
	}

	/** 
	 * Get declaration area for putting declarations.
	 * For function area, it returns the scope of function body.
	 */
	getDeclarationScope(resolveFromFnToBody: boolean): DeclarationScope {
		if (resolveFromFnToBody && transformContext.helper.isFunctionLike(this.node) && this.node.body) {
			return DeclarationScopeTree.findClosest(this.node.body)
		}
		else {

			// Found may be also a function.
			let closest = DeclarationScopeTree.findClosest(this.node)
			if (resolveFromFnToBody && transformContext.helper.isFunctionLike(closest.node) && closest.node.body) {
				return DeclarationScopeTree.findClosest(closest.node.body)
			}
			else {
				return closest
			}
		}
	}

	/** 
	 * Call after children areas are ready,
	 * and current area will exit.
	 */
	beforeExit() {
		this.capturer.beforeExit()

		if (this.parent) {
			this.parent.leaveChild(this)
		}
	}

	/** Enter a child area. */
	enterChild(child: TrackingArea) {
		this.children.push(child)
	}

	/** Leave a child area. */
	leaveChild(child: TrackingArea) {
		this.state.mergeChildArea(child)

		if (child.state.isFlowInterrupted()) {
			this.capturer.breakCaptured(child.node, child.state.flowInterruptionType)
		}
	}

	/** 
	 * Visit area node and each descendant node inside current area.
	 * When visiting a node, child nodes of this node have visited.
	 */
	visitNode(rawNode: ts.Node) {

		// Check each variable declarations.
		if (ts.isVariableDeclaration(rawNode)) {

			// `let {a} = b`, track `b.a`.
			if (rawNode.initializer) {
				for (let {node, initializer, keys} of transformContext.helper.variable.walkDeconstructedDeclarationItems(rawNode)) {

					// Skips let `a = b`.
					if (initializer && keys.length > 0) {
						this.mayAddTracking(node, 'get', initializer, keys)
					}
				}
			}
		}

		// Test and add property access nodes.
		else if (transformContext.helper.access.isAccess(rawNode)) {

			// `a[0]`, `map.get`, `set.get`.
			// If match call expression like `map.get(...)` should by better.
			if (transformContext.helper.access.isOfElementsReadAccess(rawNode)) {
				this.mayAddTracking(rawNode, 'get', rawNode.expression, [''], !!rawNode.questionDotToken)
			}

			// `[].push`, `map.set`, `set.set`.
			else if (transformContext.helper.access.isOfElementsWriteAccess(rawNode)) {
				this.mayAddTracking(rawNode, 'set', rawNode.expression, [''], !!rawNode.questionDotToken)
			}

			// `a.b`, but not `a.b` of `a.b = c`.
			else if (!transformContext.helper.assign.isWithinAssignmentTo(rawNode)) {
				this.mayAddAccessTracking(rawNode, 'get')
			}
		}

		// Test and add property assignment nodes.
		else if (transformContext.helper.assign.isAssignment(rawNode)) {
			let assignTo = transformContext.helper.assign.getToExpressions(rawNode)
			
			for (let to of assignTo) {
				if (transformContext.helper.access.isAccess(to)) {
					this.mayAddAccessTracking(to, 'set')
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

		// `fn(...)` or `new C(...)`.
		// Would be better if adding the test to `isAllElementsReadAccess` and `isAllElementsWriteAccess`,
		// But it required to look above to find closest call expression.
		else if (ts.isCallExpression(rawNode) || ts.isNewExpression(rawNode)) {
			if (ts.isCallExpression(rawNode)) {
				let ownProperty = transformContext.helper.access.getOwnPropertyReadAccess(rawNode)
				if (ownProperty) {
					let optional = transformContext.helper.access.isAccess(rawNode.expression)
						&& !!rawNode.expression.questionDotToken

					this.mayAddTracking(rawNode, 'get', ownProperty.exp, [ownProperty.key], optional)
				}
			}

			// Handle class method signatures.
			let args = rawNode.arguments
			if (args && args.length > 0) {
				let parameters = transformContext.helper.parameter.getCallParameters(rawNode)
				if (parameters && parameters.length > 0) {
					for (let {arg, typeNode} of transformContext.helper.parameter.walkDeconstructedArgumentTypeItems(args, parameters)) {
						if (typeNode && (ts.isIdentifier(arg) || transformContext.helper.access.isAccess(arg))) {
							let resolved = transformContext.helper.symbol.resolveImport(typeNode)
							if (resolved?.moduleName === 'lupos') {
								if (resolved.memberName === 'GetObserved') {
									this.mayAddTracking(arg, 'get', arg, [''])
								}
								else if (resolved.memberName === 'SetObserved') {
									this.mayAddTracking(arg, 'set', arg, [''])
								}
							}
						}
					}
				}
			}
		}

		// `[...a]`, `{...o}`, `Object.keys(a)`
		if (transformContext.helper.access.isAllElementsReadAccess(rawNode)) {
			this.mayAddTracking(rawNode, 'get', rawNode, [''])
		}

		// `Object.assign(a, ...)`
		else if (transformContext.helper.access.isAllElementsWriteAccess(rawNode)) {
			this.mayAddTracking(rawNode, 'set', rawNode, [''])
		}
		
		// Custom tracking.
		if (ts.isExpression(rawNode)) {
			let customTrackingItems = TrackingPatch.getCustomTrackingItemsByNode(rawNode)
			if (customTrackingItems) {
				for (let item of customTrackingItems) {

					// Ignored placeholders inform private-property optimization without changing capture mode.
					if (TrackingPatch.hasIgnored(item.node)) {
						continue
					}

					this.mayAddTracking(item.node, item.type, item.exp, [item.key], item.optional, isDirectAccessCaptured(item))
				}
			}
		}
	}

	/** Capture an ordinary access after splitting its receiver and key. */
	private mayAddAccessTracking(rawNode: AccessNode, type: 'get' | 'set') {
		let {exp, key, optional} = transformContext.helper.access.getAccessParts(rawNode)
		this.mayAddTracking(rawNode, type, exp, [key], optional, true)
	}

	/** Capture observed accesses or explicitly specified receiver dependencies. */
	private mayAddTracking(
		rawNode: ts.Expression,
		type: 'get' | 'set',
		exp: ts.Expression,
		keys: (string | number | ts.Expression)[],
		optional: boolean = false,
		trackSelf: boolean = false
	) {
		let ignored = type === 'get'
			? this.state.shouldIgnoreGetTracking()
			: this.state.shouldIgnoreSetTracking(rawNode)

		if (ignored || !this.capturer.shouldCapture(type)) {
			return
		}

		let willTrack = trackSelf
			? ObservedChecker.getSelfObserved(rawNode)
			: ObservedChecker.getElementsObserved(exp)

		if (willTrack) {
			this.capturer.capture(rawNode, type, exp, keys, optional)
		}
	}
}
