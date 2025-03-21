import * as ts from 'typescript'
import {InterpolationContentType, Interpolator, InterpolationPosition, VisitTree, FlowInterruptionTypeMask, Packer, helper, sourceFile, Hashing} from '../../core'
import {AccessNode} from '../../lupos-ts-module'
import {TrackingScope} from './scope'
import {TrackingScopeTree, TrackingScopeTypeMask} from './scope-tree'
import {AccessGrouper} from './access-grouper'
import {TrackingReferences} from './references'
import {Optimizer} from './optimizer'
import {TrackingScopeState} from './scope-state'
import {TrackingCapturerOperator} from './capturer-operator'
import {TrackingPatch} from './patch'
import {CapturedOutputWay} from './ranges'


/** Captured item, will be inserted to a position. */
export interface CapturedGroup {
	position: InterpolationPosition
	items: CapturedItem[]

	/** Whether output captured expressions to. */
	toNode: ts.Node

	/** Test whether have been break by async codes. */
	breakByAsync: boolean
}

/** Each capture index and capture type. */
export interface CapturedItem {

	/** Always raw node. */
	node: ts.Expression

	type: 'get' | 'set'

	/** 
	 * If `exp` and `keys` provided,
	 * they overwrites `node`.
	 * Note `exp` may not be raw node.
	 */
	exp?: ts.Expression

	/** Work with `exp` to specify which key to track. */
	key?: string | number

	/** 
	 * Whether have reference internal.
	 * If `true`, will prevent it from optimization.
	 */
	referencedAtInternal: boolean
}


/** 
 * It attaches to each scope,
 * Captures get and set expressions, and remember reference variables.
 */
export class TrackingCapturer {

	readonly scope: TrackingScope
	readonly operator: TrackingCapturerOperator
	readonly outputWay: CapturedOutputWay

	/** These properties can only be visited outside by `TrackingCapturerOperator`. */
	captured: CapturedGroup[]
	latestCaptured!: CapturedGroup
	captureType: 'get' | 'set' | 'both' | 'none' | 'not-determined' = 'not-determined'

	/** Whether accepted await interruption. */
	preventGettingAfterAwait: boolean = false

	constructor(scope: TrackingScope, state: TrackingScopeState, outputWay: CapturedOutputWay) {
		this.scope = scope
		this.operator = new TrackingCapturerOperator(this)
		this.outputWay = outputWay

		this.resetLatestCaptured()
		this.captured = [this.latestCaptured]
		this.initCaptureType(state)

		// Broadcast `preventGettingAfterAwait` to child capturers, but not to function.
		if (scope.parent && scope.parent.capturer.preventGettingAfterAwait && !helper.isFunctionLike(scope.node)) {
			this.preventGettingAfterAwait = true
		}
	}

	private resetLatestCaptured() {
		this.latestCaptured = {
			position: InterpolationPosition.Before,
			items: [],
			toNode: sourceFile,
			breakByAsync: false,
		}
	}

	/** Transfer from some captured properties to child. */
	private initCaptureType(state: TrackingScopeState) {
		let parent = this.scope.parent

		// Source file.
		if (!parent) {
			this.captureType = 'none'
		}

		// Inside a `@effect method(){...}`.
		else if (state.effectDecorated) {
			this.captureType = 'both'
		}

		// Not instantly run function-like scope not inherit capture type.
		else if (this.scope.type & TrackingScopeTypeMask.FunctionLike) {
			this.captureType = 'not-determined'
		}

		// Broadcast downward capture type from function-like scope,
		// or instantly run function-like scope like function not exist.
		else {
			this.captureType = parent.capturer.captureType
		}
	}

	/** Every time capture a new index, check type and may toggle capture type. */
	private addCaptureType(type: 'get' | 'set') {

		// Broadcast downward from closest function-like scope,
		// to all get-type descendants exclude non-instantly run functions.
		if (type === 'set' && (this.captureType === 'get' || this.captureType === 'not-determined')) {
			let closest = this.scope.closestNonInstantlyRunFunction!

			let walking = TrackingScopeTree.walkInwardChildFirst(closest, c => {

				// Topmost scope is always persist.
				if (c === closest) {
					return true
				}

				// Skip set region.
				if (c.capturer.captureType === 'set') {
					return false
				}

				// Skip inner function.
				if (c.type & TrackingScopeTypeMask.FunctionLike
					&& (c.type & TrackingScopeTypeMask.InstantlyRunFunction) === 0
				) {
					return false
				}

				return true
			})
			
			for (let descent of walking) {
				descent.capturer.switchFromGetToSetCaptureType()
			}
		}
		else if (this.captureType === 'not-determined') {
			this.captureType = type
		}
	}

	/** Whether should capture with specified type. */
	shouldCapture(type: 'get' | 'set'): boolean {

		// If not within a function-like, should never capture.
		if (this.captureType === 'none') {
			return false
		}

		if (this.preventGettingAfterAwait && type === 'get') {
			return false
		}

		if (this.captureType === 'set' && type === 'get') {
			return false
		}
		else {
			return true
		}
	}

	/** Capture a node. */
	capture(
		rawNode: ts.Expression,
		type: 'get' | 'set',
		exp: ts.Expression | undefined,
		keys: (string | number)[] | undefined,
	) {
		this.addCaptureType(type)

		if (exp && keys) {
			for (let key of keys) {
				let item: CapturedItem = {
					node: rawNode,
					type,
					exp,
					key,
					referencedAtInternal: false,
				}
	
				this.latestCaptured.items.push(item)
				exp = Packer.createAccessNode(exp, key)
			}
		}
		else {
			let item: CapturedItem = {
				node: rawNode,
				type,
				exp,
				key: undefined,
				referencedAtInternal: false,
			}

			this.latestCaptured.items.push(item)
		}
	}

	/** Whether has captured some nodes. */
	hasCaptured(): boolean {
		return this.captured.some(item => item.items.length > 0)
	}

	/** Walk for captured item for self and all descendants. */
	*walkCapturedRecursively():	Iterable<CapturedItem>	{
		for (let group of this.captured) {
			yield* group.items
		}

		for (let child of this.scope.children) {
			yield* child.capturer.walkCapturedRecursively()
		}
	}

	/** Switch capture type to `set` from `get`. */
	private switchFromGetToSetCaptureType() {
		this.captureType = 'set'

		// Clean captured items, but keep empty captured for optimization.
		for (let group of this.captured) {
			group.items = []
		}
	}

	/** Insert captured nodes to specified position. */
	breakCaptured(atNode: ts.Node, flowInterruptedBy: FlowInterruptionTypeMask | 0) {
		// Even no nodes captured, still break.
		// Later may append nodes to this item.

		// Conditional can't be break, it captures only condition expression.
		// This is required, or inner captured can't be moved to head, and cause interpolation issue.
		if (this.scope.type & TrackingScopeTypeMask.Conditional
			|| this.scope.type & TrackingScopeTypeMask.Switch
		) {
			return
		}

		this.latestCaptured.toNode = atNode
		this.latestCaptured.breakByAsync = (flowInterruptedBy & (
				FlowInterruptionTypeMask.Yield
					| FlowInterruptionTypeMask.Await
					| FlowInterruptionTypeMask.ConditionalAwait
			)) > 0

		this.resetLatestCaptured()
		this.captured.push(this.latestCaptured)

		this.preventGettingAfterAwait = this.preventGettingAfterAwait || (flowInterruptedBy & FlowInterruptionTypeMask.Await) > 0
	}

	/** Before each scope will exit. */
	beforeExit() {
		this.endCapture()

		if (this.scope.type & TrackingScopeTypeMask.SourceFile) {

			// Do reference and optimization, ensure child-first then self.
			for (let descent of TrackingScopeTree.walkInwardChildFirst(this.scope)) {
				descent.capturer.preProcessCaptured()
			}

			// Do output, either child-first or self-first should be OK.
			for (let descent of TrackingScopeTree.walkInwardSelfFirst(this.scope)) {
				descent.capturer.postProcessCaptured()
			}
		}
	}

	/** Prepare latest captured item. */
	private endCapture() {
		let item = this.latestCaptured
		let node = this.scope.node

		item.toNode = node

		// For function declaration, insert to function body.
		if (this.scope.type & TrackingScopeTypeMask.FunctionLike) {
			let body = (node as ts.FunctionLikeDeclarationBase).body

			// Abstract function or function type declaration has no body.
			if (body) {
				item.toNode = body

				if (ts.isBlock(body)) {
					item.position = InterpolationPosition.Append
				}
				else {
					item.position = InterpolationPosition.After
				}
			}
		}

		// Insert before whole content of target capturer.
		// Normally codes will be moved outward on optimization step.
		// This codes can avoid error occurred even no optimization.
		else if (this.scope.type & TrackingScopeTypeMask.FlowInterruption
			|| this.scope.type & TrackingScopeTypeMask.Conditional
			|| this.scope.type & TrackingScopeTypeMask.Switch
		) {
			item.position = InterpolationPosition.Before
		}

		// Can put statements, insert to the end of statements.
		else if (Packer.canPutStatements(node)) {
			item.position = InterpolationPosition.Append
		}

		// Insert to the end.
		else {
			item.position = InterpolationPosition.After
		}
	}

	/** 
	 * Iterate captured items than runs immediately.
	 * If meets `await` or `yield`, stop iteration.
	 * Ignores those which will be referenced.
	 */
	*iterateNotReferencedImmediateCapturedItems(): Iterable<CapturedItem> {
		for (let group of this.captured) {
			for (let item of [...group.items]) {

				// Has been referenced, will be replaced.
				if (item.referencedAtInternal) {
					continue
				}

				yield item
			}

			// Break here after meets like 'await'.
			if (group.breakByAsync) {
				return
			}
		}
	}

	/** 
	 * Iterate captured items than runs immediately and always run.
	 * If meets any conditions, or `await` or `yield`, stop iteration.
	 * Ignores those which will be referenced.
	 */
	*iterateNotReferencedImmediateRunAndAlwaysRunCapturedItems(): Iterable<CapturedItem> {
		for (let item of [...this.captured[0].items]) {

			// Has been referenced, will be replaced.
			if (item.referencedAtInternal) {
				continue
			}

			yield item
		}
	}

	/** Process current captured, step 1. */
	private preProcessCaptured() {

		// Run in child-first order is important, checking references step may
		// add more variables, and adjust captured.
		this.checkReferences()

		// Must after reference step, reference step will look for position,
		// which requires captured stay at their scope.
		Optimizer.optimize(this.scope)
	}

	/** 
	 * Process current captured, step 2.
	 * Previous step may move captured forward or backward.
	 */
	private postProcessCaptured() {

		// Output customized.
		if (this.outputWay === CapturedOutputWay.Custom) {
			return
		}

		this.outputCaptured()
	}
	
	/** Check captured and reference if needs. */
	private checkReferences() {
		for (let group of this.captured) {
			for (let item of group.items) {
				if (item.exp) {
					TrackingReferences.mayReferenceExp(item.exp, group.toNode, this.scope)
				}
				else {
					TrackingReferences.mayReferenceAccess(item.node, group.toNode, this.scope)
				}

				item.referencedAtInternal = TrackingReferences.hasInternalReferenced(item.exp ?? item.node)
			}
		}
	}

	/** Add `captured` as interpolation items. */
	private outputCaptured() {
		for (let group of this.captured) {
			if (group.items.length === 0) {
				continue
			}

			this.outputCapturedGroup(group)
		}
	}

	/** Add each `captured` group. */
	private outputCapturedGroup(group: CapturedGroup) {
		let oldToNode = group.toNode
		let newToNode = this.findBetterInsertPosition(oldToNode)!
		let itemsInsertToOldPosition: CapturedItem[] = []
		let itemsInsertToNewPosition: CapturedItem[] = []

		let items = group.items.filter(item => {
			return !TrackingPatch.hasIgnored(item.exp ?? item.node)
		})

		if (newToNode !== null) {
			for (let item of items) {
				let hashed = Hashing.hashNode(item.node)

				// Only when all used nodes in the preceding of new index.
				let canMove = hashed.usedDeclarations.every(usedIndex => VisitTree.isPrecedingOf(usedIndex, newToNode))

				if (canMove) {
					itemsInsertToNewPosition.push(item)
				}
				else {
					itemsInsertToOldPosition.push(item)
				}
			}
		}
		else {
			itemsInsertToOldPosition = items
		}

		if (itemsInsertToNewPosition.length > 0) {
			Interpolator.add(newToNode, {

				// For new position, always insert to `Before`.
				position: InterpolationPosition.Before,

				contentType: InterpolationContentType.Tracking,
				exps: () => this.makeCapturedExps(itemsInsertToNewPosition),
			})
		}

		if (itemsInsertToOldPosition.length > 0) {
			Interpolator.add(oldToNode, {
				position: group.position,
				contentType: InterpolationContentType.Tracking,
				exps: () => this.makeCapturedExps(itemsInsertToOldPosition),
			})
		}

		if (items.some(index => index.type === 'get')) {
			AccessGrouper.addImport('get')
		}

		if (items.some(index => index.type === 'set')) {
			AccessGrouper.addImport('set')
		}
	}

	/** Try to find a better position to insert captured. */
	private findBetterInsertPosition(toNode: ts.Node): ts.Node | null {
		let position = TrackingScopeTree.findClosestPositionToAddStatements(toNode, this.scope)
		if (!position) {
			return null
		}

		// Same position.
		if (position.toNode === toNode) {
			return null
		}

		return position.toNode
	}

	/** Transfer specified captured items to specified position. */
	private makeCapturedExps(items: CapturedItem[]): ts.Expression[] {
		let getItems = items.filter(index => index.type === 'get')
		let setItems = items.filter(index => index.type === 'set')

		let getNodes = getItems.map(item => this.makeAccessNodes(item)).flat()
		let setNodes = setItems.map(item => this.makeAccessNodes(item)).flat()

		return [
			...AccessGrouper.makeExpressions(getNodes, 'get'),
			...AccessGrouper.makeExpressions(setNodes, 'set'),
		]
	}

	/** Make an access node by a captured item. */
	private makeAccessNodes(item: CapturedItem): AccessNode[] {
		if (item.exp) {
			let nodes: AccessNode[] = []
			let node = Interpolator.outputReplaceableChildren(item.exp) as ts.Expression
			let key = item.key!
			let queryDot = helper.access.isAccess(item.node) && !!item.node.questionDotToken

			node = Packer.createAccessNode(node, key, queryDot)
			nodes.push(node as AccessNode)

			return nodes
		}
		else {
			let node = Interpolator.outputChildren(item.node) as AccessNode
			return [node]
		}
	}

	/** Output captured as tracking expressions. */
	outputCustomCaptured(): ts.Expression[] {
		if (this.outputWay !== CapturedOutputWay.Custom) {
			throw new Error(`Only capturer in "Custom" output way can output custom captured!`)
		}

		let exps: ts.Expression[] = []

		for (let group of this.captured) {
			if (group.items.length === 0) {
				continue
			}

			exps.push(...this.makeCapturedExps(group.items))
		}

		return exps
	}
}