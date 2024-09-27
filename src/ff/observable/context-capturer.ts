import type TS from 'typescript'
import {InterpolationContentType, AccessNode, Helper, Interpolator, InterpolationPosition, VisitTree, ts, FlowInterruptionTypeMask, ScopeTree} from '../../base'
import {Context} from './context'
import {ContextTree, ContextTypeMask} from './context-tree'
import {AccessGrouper} from './access-grouper'
import {AccessReferences} from './access-references'
import {Optimizer} from './optimizer'
import {removeFromList} from '../../utils'
import {ContextState} from './context-state'
import {ObservedChecker} from './observed-checker'
import {ContextCapturerOperator} from './context-capturer-operator'


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
 * It attaches to each context,
 * Captures get and set expressions, and remember reference variables.
 */
export class ContextCapturer {

	readonly context: Context
	readonly operator: ContextCapturerOperator

	/** These properties can only be visited outside by `ContextCapturerOperator`. */
	captured: CapturedGroup[]
	latestCaptured!: CapturedGroup
	captureType: 'get' | 'set' | 'both' = 'get'

	constructor(context: Context, state: ContextState) {
		this.context = context
		this.operator = new ContextCapturerOperator(this)

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
	private initCaptureType(state: ContextState) {
		let parent = this.context.parent
		if (!parent) {
			return
		}

		// Inside a `@effect method(){...}`.
		if (state.effectDecorated) {
			this.captureType = 'both'
		}

		// Broadcast downward capture type within a function-like context.
		else if ((parent.type & ContextTypeMask.FunctionLike) === 0) {
			this.captureType = parent.capturer.captureType
		}
	}

	/** Whether should capture indices in specified type. */
	shouldCapture(type: 'get' | 'set'): boolean {
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
		keys: (string | number)[] | undefined, type: 'get' | 'set'
	) {
		let index = VisitTree.getIndex(node)
		let expIndex = exp ? VisitTree.getIndex(exp) : undefined

		this.addCaptureType(type)

		// Remove repetitive item, normally `a.b = c`,
		// `a.b` has been captured as get type, and later set type.
		let repetitiveIndex = this.latestCaptured.items.find(item => item.index === index)
		if (repetitiveIndex) {
			removeFromList(this.latestCaptured.items, repetitiveIndex)
		}

		let item: CapturedItem = {
			index,
			type,
			expIndex,
			keys,
		}

		// `a[0]` -> `trackGet(a, '')`
		if (Helper.access.isAccess(node) && !exp) {
			if (type === 'get' && ObservedChecker.isListStructReadingAccess(node)
				|| type === 'set' && ObservedChecker.isListStructWritingAccess(node)
			) {
				item.expIndex = VisitTree.getIndex(node.expression)
				item.keys = ['']
			}
		}

		this.latestCaptured.items.push(item)
	}

	/** Whether has captured some indices. */
	hasCaptured(): boolean {
		return this.captured.some(item => item.items.length > 0)
	}

	/** Every time capture a new index, check type and may toggle capture type. */
	private addCaptureType(type: 'get' | 'set') {
		if (type === 'set' && this.captureType === 'get') {
			let closest = this.context.closestFunctionLike

			// Broadcast downward from closest function-like context, to all get-type descendants.
			let walking = ContextTree.walkInwardChildFirst(closest,
				c => c.closestFunctionLike === closest
					&& c.capturer.captureType === 'get'
			)
			
			for (let descent of walking) {
				descent.capturer.applySetCaptureTypeFromGet()
			}
		}
	}

	/** Apply capture type to `set` from 'get. */
	private applySetCaptureTypeFromGet() {
		this.captureType = 'set'
		this.latestCaptured.items = []
		this.captured = [this.latestCaptured]
	}

	/** Insert captured indices to specified position. */
	breakCaptured(atIndex: number, flowInterruptedBy: number) {
		// Even no indices captured, still break.
		// Later may append indices to this item.

		// Conditional can't be break, it captures only condition expression.
		if (this.context.type & ContextTypeMask.Conditional) {
			return
		}

		this.latestCaptured.toIndex = atIndex
		this.latestCaptured.flowInterruptedBy = flowInterruptedBy
		this.resetLatestCaptured()
		this.captured.push(this.latestCaptured)
	}

	/** Before each context will exit. */
	beforeExit() {
		this.endCapture()

		if (this.context.type & ContextTypeMask.SourceFile) {

			// Do referencing and optimization, ensure child-first then self.
			for (let descent of ContextTree.walkInwardChildFirst(this.context)) {
				descent.capturer.preProcessCaptured()
			}

			// Do output, either child-first or self-first should be OK.
			for (let descent of ContextTree.walkInwardSelfFirst(this.context)) {
				descent.capturer.postProcessCaptured()
			}
		}
	}

	/** Prepare latest captured item. */
	private endCapture() {
		let item = this.latestCaptured
		let index = this.context.visitIndex
		let node = this.context.node

		item.toIndex = index

		// For function declaration, insert to function body.
		if (this.context.type & ContextTypeMask.FunctionLike) {
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
		else if (this.context.type & ContextTypeMask.FlowInterruption
			|| this.context.type & ContextTypeMask.Conditional
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

	/** Process current captured, step 1. */
	private preProcessCaptured() {

		// Child-first order is important, checking references step may
		// add more variables, and adjust captured.
		this.checkAccessReferences()

		// Must after reference step, reference step will look for position,
		// which requires indices stay at their context.
		Optimizer.optimize(this.context)
	}

	/** 
	 * Process current captured, step 2.
	 * Previous step may move indices forward or backward.
	 */
	private postProcessCaptured() {
		this.interpolateCaptured()
	}
	
	/** Check captured indices and reference if needs. */
	private checkAccessReferences() {
		for (let item of this.captured) {
			for (let {index} of item.items) {
				AccessReferences.mayReferenceAccess(index, this.context)
			}
		}
	}

	/** Add `captured` as interpolation items. */
	private interpolateCaptured() {
		for (let item of this.captured) {
			if (item.items.length === 0) {
				continue
			}

			this.interpolateCapturedGroup(item)
		}
	}

	/** Add each `captured` group. */
	private interpolateCapturedGroup(group: CapturedGroup) {
		let oldToIndex = group.toIndex
		let newToIndex = this.findBetterInsertPosition(oldToIndex)!
		let itemsInsertToOldPosition: CapturedItem[] = []
		let itemsInsertToNewPosition: CapturedItem[] = []

		if (newToIndex !== null) {
			for (let index of group.items) {
				let hashed = ScopeTree.hashIndex(index.index)
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
			itemsInsertToOldPosition = group.items
		}

		if (itemsInsertToNewPosition.length > 0) {
			Interpolator.add(newToIndex, {
				position: group.position,
				contentType: InterpolationContentType.Tracking,
				exps: () => this.outputCaptured(itemsInsertToNewPosition),
			})
		}

		if (itemsInsertToOldPosition.length > 0) {
			Interpolator.add(oldToIndex, {
				position: group.position,
				contentType: InterpolationContentType.Tracking,
				exps: () => this.outputCaptured(itemsInsertToOldPosition),
			})
		}

		if (group.items.some(index => index.type === 'get')) {
			AccessGrouper.addImport('get')
		}

		if (group.items.some(index => index.type === 'set')) {
			AccessGrouper.addImport('set')
		}
	}

	/** Try to find a better position to insert captured. */
	private findBetterInsertPosition(index: number): number | null {
		let position = ContextTree.findClosestPositionToAddStatements(index, this.context)
		if (!position) {
			return null
		}

		// Must in same context.
		if (position.context !== this.context) {
			return null
		}

		// Same position.
		if (position.index === index) {
			return null
		}

		return position.index
	}

	/** Transfer specified indices to specified position. */
	private outputCaptured(items: CapturedItem[]): TS.Expression[] {
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
}