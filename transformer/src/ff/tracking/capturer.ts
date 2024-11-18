import type TS from 'typescript'
import {InterpolationContentType, AccessNode, Helper, Interpolator, InterpolationPosition, VisitTree, ts, FlowInterruptionTypeMask, ScopeTree} from '../../core'
import {TrackingScope} from './scope'
import {TrackingScopeTree, TrackingScopeTypeMask} from './scope-tree'
import {AccessGrouper} from './access-grouper'
import {AccessReferences} from './access-references'
import {Optimizer} from './optimizer'
import {removeFromList} from '../../utils'
import {TrackingScopeState} from './scope-state'
import {TrackingCapturerOperator} from './capturer-operator'
import {TrackingPatch} from './patch'
import {CapturedOutputWay} from './ranges'


/** Captured item, will be inserted to a position. */
export interface CapturedGroup {
	position: InterpolationPosition
	items: CapturedItem[]
	toIndex: number
	flowInterruptedBy: FlowInterruptionTypeMask | 0
}

/** Each capture index and capture type. */
export interface CapturedItem {
	index: number
	type: 'get' | 'set'

	/** 
	 * If `expIndex` and `paths` provided,
	 * they overwrites `index`.
	 */
	expIndex?: number
	keys?: (string | number)[]
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

	constructor(scope: TrackingScope, state: TrackingScopeState, outputWay: CapturedOutputWay) {
		this.scope = scope
		this.operator = new TrackingCapturerOperator(this)
		this.outputWay = outputWay

		this.resetLatestCaptured()
		this.captured = [this.latestCaptured]
		this.initCaptureType(state)
	}

	private resetLatestCaptured() {
		this.latestCaptured = {
			position: InterpolationPosition.Before,
			items: [],
			toIndex: -1,
			flowInterruptedBy: 0,
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
		if (this.captureType === 'not-determined') {
			this.captureType = type
		}
		
		// Broadcast downward from closest function-like scope,
		// to all get-type descendants exclude non-instantly run functions.
		if (type === 'set' && this.captureType === 'get') {
			let closest = this.scope.closestNonInstantlyRunFunction!

			let walking = TrackingScopeTree.walkInwardChildFirst(closest, c => {
				if (c.capturer.captureType !== 'get') {
					return false
				}

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
	}

	/** Whether should capture indices in specified type. */
	shouldCapture(type: 'get' | 'set'): boolean {

		// If not within a function-like, should never capture.
		if (this.captureType === 'none') {
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
		node: AccessNode | TS.Identifier,
		exp: TS.Expression | undefined,
		keys: (string | number)[] | undefined,
		type: 'get' | 'set'
	) {
		this.addCaptureType(type)

		if (!exp) {

			// `a[0]` -> `trackGet(a, '')`
			if (Helper.access.isAccess(node)
				&& Helper.isListStruct(node.expression)
			) {
				exp = node.expression
				keys = ['']
			}

			// `[...a]`
			else if (Helper.isArraySpreadElement(node)) {
				exp = node
				keys = ['']
			}
		}

		let index = VisitTree.getIndex(node)
		let expIndex = exp ? VisitTree.getIndex(exp) : undefined

		// Remove repetitive item, normally `a.b = c`,
		// `a.b` has been captured as get type, and later set type.
		// Removing repetitive make it works for `both` tracking type.
		let repetitiveItem = this.latestCaptured.items.find(item => {
			return item.index === index
				&& item.expIndex === expIndex
				&& item.keys === keys
		})

		if (repetitiveItem) {
			removeFromList(this.latestCaptured.items, repetitiveItem)
		}

		let item: CapturedItem = {
			index,
			type,
			expIndex,
			keys,
		}

		this.latestCaptured.items.push(item)
	}

	/** Whether has captured some indices. */
	hasCaptured(): boolean {
		return this.captured.some(item => item.items.length > 0)
	}

	/** Switch capture type to `set` from `get`. */
	private switchFromGetToSetCaptureType() {
		this.captureType = 'set'
		this.latestCaptured.items = []
		this.captured = [this.latestCaptured]
	}

	/** Insert captured indices to specified position. */
	breakCaptured(atIndex: number, flowInterruptedBy: FlowInterruptionTypeMask | 0) {
		// Even no indices captured, still break.
		// Later may append indices to this item.

		// Conditional can't be break, it captures only condition expression.
		// This is required, or inner captured can't be moved to head.
		if (this.scope.type & TrackingScopeTypeMask.Conditional
			|| this.scope.type & TrackingScopeTypeMask.Switch
		) {
			return
		}

		this.latestCaptured.toIndex = atIndex
		this.latestCaptured.flowInterruptedBy = flowInterruptedBy
		this.resetLatestCaptured()
		this.captured.push(this.latestCaptured)
	}

	/** Before each scope will exit. */
	beforeExit() {
		this.endCapture()

		if (this.scope.type & TrackingScopeTypeMask.SourceFile) {

			// Do referencing and optimization, ensure child-first then self.
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
		let index = this.scope.visitIndex
		let node = this.scope.node

		item.toIndex = index

		// For function declaration, insert to function body.
		if (this.scope.type & TrackingScopeTypeMask.FunctionLike) {
			let body = (node as TS.FunctionLikeDeclarationBase).body

			// Abstract function or function type declaration has no body.
			if (body) {
				item.toIndex = VisitTree.getIndex(body)

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
		else if (Helper.pack.canPutStatements(node)) {
			item.position = InterpolationPosition.Append
		}

		// Insert to the end.
		else {
			item.position = InterpolationPosition.After
		}
	}

	/** 
	 * Iterate hash names of captured.
	 * If meet `await` or `yield`, stop iteration.
	 */
	*iterateImmediateCapturedHashNames(): Iterable<string> {
		for (let group of this.captured) {
			for (let item of [...group.items]) {

				// Has been referenced, ignore always.
				if (AccessReferences.hasExternalAccessReferenced(item.index, true)) {
					continue
				}

				let hashName = TrackingCapturerOperator.hashCapturedItem(item).name
				yield hashName
			}

			// Break by yield or await.
			if (group.flowInterruptedBy & FlowInterruptionTypeMask.YieldLike) {
				return
			}
		}
	}

	/** Process current captured, step 1. */
	private preProcessCaptured() {

		// Run in child-first order is important, checking references step may
		// add more variables, and adjust captured.
		this.checkAccessReferences()

		// Must after reference step, reference step will look for position,
		// which requires indices stay at their scope.
		Optimizer.optimize(this.scope)
	}

	/** 
	 * Process current captured, step 2.
	 * Previous step may move indices forward or backward.
	 */
	private postProcessCaptured() {

		// Output customized.
		if (this.outputWay === CapturedOutputWay.Custom) {
			return
		}

		this.outputCaptured()
	}
	
	/** Check captured indices and reference if needs. */
	private checkAccessReferences() {
		for (let item of this.captured) {
			for (let {index} of item.items) {
				AccessReferences.mayReferenceAccess(index, item.toIndex, this.scope)
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
		let oldToIndex = group.toIndex
		let newToIndex = this.findBetterInsertPosition(oldToIndex)!
		let itemsInsertToOldPosition: CapturedItem[] = []
		let itemsInsertToNewPosition: CapturedItem[] = []

		let items = group.items.filter(item => {
			return !TrackingPatch.isIgnored(VisitTree.getNode(item.expIndex ?? item.index))
		})

		if (newToIndex !== null) {
			for (let index of items) {
				let hashed = ScopeTree.hashIndex(index.index)

				// Only when all used indices in the preceding of new index.
				let canMove = hashed.usedIndices.every(usedIndex => VisitTree.isPrecedingOf(usedIndex, newToIndex))

				if (canMove) {
					itemsInsertToNewPosition.push(index)
				}
				else {
					itemsInsertToOldPosition.push(index)
				}
			}
		}
		else {
			itemsInsertToOldPosition = items
		}

		if (itemsInsertToNewPosition.length > 0) {
			Interpolator.add(newToIndex, {

				// For new position, always insert to `Before`.
				position: InterpolationPosition.Before,

				contentType: InterpolationContentType.Tracking,
				exps: () => this.makeCapturedExps(itemsInsertToNewPosition),
			})
		}

		if (itemsInsertToOldPosition.length > 0) {
			Interpolator.add(oldToIndex, {
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
	private findBetterInsertPosition(index: number): number | null {
		let position = TrackingScopeTree.findClosestPositionToAddStatements(index, this.scope)
		if (!position) {
			return null
		}

		// Same position.
		if (position.index === index) {
			return null
		}

		return position.index
	}

	/** Transfer specified indices to specified position. */
	private makeCapturedExps(items: CapturedItem[]): TS.Expression[] {
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
		if (item.expIndex !== undefined) {
			let nodes: AccessNode[] = []

			// Expression of an access node may be totally replaced after been referenced as `$ref_0`.
			let node = Interpolator.outputSelf(item.expIndex) as TS.Expression
			let keys = item.keys!

			node = Helper.pack.extractFinalParenthesized(node) as AccessNode

			for (let key of keys) {
				node = Helper.createAccessNode(node, key)
				nodes.push(node as AccessNode)
			}

			return nodes
		}
		else {
			let node = Interpolator.outputChildren(item.index) as AccessNode
			node = Helper.pack.extractFinalParenthesized(node) as AccessNode
			
			return [node]
		}
	}

	/** Output captured as tracking expressions. */
	outputCustomCaptured(): TS.Expression[] {
		if (this.outputWay !== CapturedOutputWay.Custom) {
			throw new Error(`Only capturer in "Custom" output way can output custom captured!`)
		}

		let exps: TS.Expression[] = []

		for (let group of this.captured) {
			if (group.items.length === 0) {
				continue
			}

			exps.push(...this.makeCapturedExps(group.items))
		}

		return exps
	}
}