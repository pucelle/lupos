import type TS from 'typescript'
import {InterpolationContentType, AccessNode, helper, interpolator, modifier, InterpolationPosition, visiting, ts, FlowInterruptionTypeMask} from '../../base'
import {Context} from './context'
import {ContextTree, ContextTypeMask} from './context-tree'
import {AccessGrouper} from './access-grouper'
import {AccessReferences} from './access-references'
import {Optimizer} from './optimizer'
import {Hashing} from './hashing'
import {removeFromList} from '../../utils'


/** Captured item, will be inserted to a position. */
interface CapturedItem {
	position: InterpolationPosition
	indices: number[]
	toIndex: number
	flowInterruptedBy: number
}


/** 
 * It attaches to each context,
 * Captures get and set expressions, and remember reference variables.
 */
export class ContextCapturer {

	
	/** Get intersected indices across capturers. */
	static intersectIndices(capturers: ContextCapturer[]): number[] {
		let map: Map<string, number>

		for (let i = 0; i < capturers.length; i++) {
			let capturer = capturers[i]
			let ownMap: Map<string, number> = new Map()

			// Only codes of the first item is always running.
			for (let index of capturer.captured[0].indices) {

				// Has been referenced, ignore always.
				if (AccessReferences.isAccessReferencedExternal(index)) {
					continue
				}

				let hashName = Hashing.getHash(index, capturer.context).name
				ownMap.set(hashName, index)
			}

			if (i === 0) {
				map = ownMap
			}
			else {
				for (let key of [...map!.keys()]) {
					if (!ownMap.has(key)) {
						map!.delete(key)
					}
				}
			}

			if (map!.size === 0) {
				break
			}
		}

		return [...map!.values()]
	}


	readonly context: Context
	private variableNames: string[] = []
	private variableInterpolateIndex: number = -1
	private captured: CapturedItem[]
	private latestCaptured!: CapturedItem
	private captureType: 'get' | 'set' = 'get'

	constructor(context: Context) {
		this.context = context

		this.resetLatestCaptured()
		this.captured = [this.latestCaptured]
		this.fromParent()
	}

	private resetLatestCaptured() {
		this.latestCaptured = {
			position: InterpolationPosition.Before,
			indices: [],
			toIndex: -1,
			flowInterruptedBy: 0,
		}
	}

	/** Transfer from some captured properties to child. */
	private fromParent() {
		let parent = this.context.parent
		if (!parent) {
			return
		}

		// Broadcast down capture type within a function-like context.
		if ((parent.type & ContextTypeMask.FunctionLike) === 0) {
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

	/** Capture an index. */
	capture(index: number, type: 'get' | 'set') {
		this.addCaptureType(type)
		this.latestCaptured.indices.push(index)
	}

	/** Whether has captured some indices. */
	hasCaptured(): boolean {
		return this.captured.some(item => item.indices.length > 0)
	}

	/** Every time capture a new index, check type and may toggle capture type. */
	private addCaptureType(type: 'get' | 'set') {
		if (type === 'set' && this.captureType === 'get') {

			// Broadcast to closest function-like context, and broadcast down.
			let walking = ContextTree.walkInwardChildFirst(
				this.context.closestFunctionLike,
				c => c.capturer.captureType === 'get'
			)
			
			for (let descent of walking) {
				descent.capturer.applySetCaptureType()
			}
		}
	}

	/** Apply capture type to `set`. */
	private applySetCaptureType() {
		this.captureType = 'set'
		this.captured = [this.latestCaptured]
		this.latestCaptured.indices = []
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

	/** 
	 * Add a unique variable by variable name.
	 * Current context must be a found context than can be added.
	 */
	addUniqueVariable(variableName: string, index: number) {
		this.variableNames.push(variableName)
		this.variableInterpolateIndex = index
	}

	/** Before each context will exit. */
	beforeExit() {
		this.endCapture()

		if (this.context === this.context.closestFunctionLike) {
			for (let descent of this.walkInwardChildFirst()) {
				descent.preProcessCaptured()
			}

			for (let descent of this.walkInwardSelfFirst()) {
				descent.postProcessCaptured()
			}
		}
	}

	private* walkInwardChildFirst(): Iterable<ContextCapturer> {
		for (let context of ContextTree.walkInwardChildFirst(
			this.context.closestFunctionLike,
			c => c.closestFunctionLike === this.context
		)) {
			yield context.capturer
		}
	}

	private* walkInwardSelfFirst(): Iterable<ContextCapturer> {
		for (let context of ContextTree.walkInwardSelfFirst(
			this.context.closestFunctionLike,
			c => c.closestFunctionLike === this.context
		)) {
			yield context.capturer
		}
	}

	/** Prepare latest captured item. */
	private endCapture() {
		let item = this.latestCaptured
		let index = this.context.visitingIndex
		let node = this.context.node

		item.toIndex = index

		// Insert to function body.
		if (this.context.type & ContextTypeMask.FunctionLike) {
			let body = (node as TS.FunctionLikeDeclarationBase).body!
			item.toIndex = visiting.getIndex(body)

			if (ts.isBlock(body)) {
				item.position = InterpolationPosition.Append
			}
			else {
				item.position = InterpolationPosition.After
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
		else if (helper.pack.canPutStatements(node)) {
			item.position = InterpolationPosition.Append
		}

		// Insert to the end.
		else {
			item.position = InterpolationPosition.After
		}
	}

	/** Process current captured, step 1. */
	private preProcessCaptured() {

		// First order is important, checking references step may
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
		this.interpolateVariables()
		this.interpolateCaptured()
	}
	
	/** Check captured indices and reference if possible. */
	private checkAccessReferences() {
		for (let item of this.captured) {
			for (let index of item.indices) {
				AccessReferences.mayReferenceAccess(index, this.context)
			}
		}
	}

	/** Add reference variables as declaration statements. */
	private interpolateVariables() {
		if (this.variableNames.length === 0) {
			return
		}

		modifier.addVariables(this.variableInterpolateIndex, this.variableNames)
		this.variableNames = []
	}

	/** Add `captured` as interpolation items. */
	private interpolateCaptured() {
		for (let item of this.captured) {
			if (item.indices.length === 0) {
				continue
			}

			interpolator.add(item.toIndex, {
				position: item.position,
				contentType: InterpolationContentType.Tracking,
				exps: () => this.outputCaptured(item.indices),
			})

			AccessGrouper.addImport(this.captureType)
		}
	}

	/** Transfer specified indices to specified position. */
	private outputCaptured(captured: number[]): TS.Expression[] {
		let exps = captured.map(i => {
			let node = interpolator.outputChildren(i)
			return helper.pack.extractFinalParenthesized(node)
		}) as AccessNode[]

		return AccessGrouper.makeExpressions(exps, this.captureType)
	}


	/** 
	 * Move captured indices to an ancestral, target capturer.
	 * If a node with captured index use local variables and can't be moved, leave it.
	 */
	moveCapturedOutwardTo(toCapturer: ContextCapturer) {
		let indices = this.captured[0].indices
		if (indices.length === 0) {
			return
		}

		let residualIndices = toCapturer.moveCapturedIndicesIn(indices, this)
		this.captured[0].indices = residualIndices
	}

	/** 
	 * Try to move captured indices to self.
	 * `fromCapturer` locates where indices move from.
	 * Returns residual indices that failed to move.
	 */
	moveCapturedIndicesIn(indices: number[], fromCapturer: ContextCapturer): number[] {
		let item = this.captured.find(item => {

			// Look upward until sibling of `toIndex`
			let itemSiblingIndex = visiting.findOutwardSiblingWith(fromCapturer.context.visitingIndex, item.toIndex)
			if (itemSiblingIndex === undefined) {
				return false
			}

			return item.toIndex >= itemSiblingIndex
		}) || this.latestCaptured

		let contextLeaves = ContextTree.getWalkingOutwardLeaves(fromCapturer.context, this.context)
		let leavedIndices = contextLeaves.map(c => c.visitingIndex)
		let residualIndices: number[] = []

		for (let index of indices) {
			let node = visiting.getNode(index)
			let hashed = Hashing.getHash(index, fromCapturer.context)

			// `a[i]`, and a is array, ignore hash of `i`.
			if (ts.isElementAccessExpression(node)
				&& ts.isIdentifier(node.argumentExpression)
				&& helper.types.isArrayType(helper.types.getType(node.expression))
			) {
				hashed = Hashing.getHash(visiting.getIndex(node.expression), fromCapturer.context)
			}

			// Leave contexts contain any referenced variable.
			if (hashed.referenceIndices.some(i => leavedIndices.includes(i))) {
				residualIndices.push(index)
			}
			else {
				item.indices.push(index)
			}
		}

		return residualIndices
	}

	/** Eliminate repetitive captured with an outer hash. */
	eliminateRepetitiveRecursively(hashSet: Set<string>) {
		let ownHashes = new Set(hashSet)
		let startChildIndex = 0

		for (let item of this.captured) {
			for (let index of [...item.indices]) {

				// Has been referenced, ignore always.
				if (AccessReferences.isAccessReferencedExternal(index)) {
					continue
				}

				let hashName = Hashing.getHash(index, this.context).name
				if (ownHashes.has(hashName)) {
					removeFromList(item.indices, index)
				}
				else {
					ownHashes.add(hashName)
				}

				// Has yield like.
				if ((item.flowInterruptedBy & FlowInterruptionTypeMask.YieldLike) > 0) {
					ownHashes.clear()
				}
			}

			// Every time after update hash set, recursively eliminating child context,
			// which's visiting index <= captured `toIndex`.
			for (; startChildIndex < this.context.children.length; startChildIndex++) {
				let child = this.context.children[startChildIndex]
				if (child.visitingIndex > item.toIndex) {
					break
				}

				child.capturer.eliminateRepetitiveRecursively(ownHashes)
			}
		}

		// Last captured item may have wrong `toIndex`, here ensure to visit all child contexts.
		for (; startChildIndex < this.context.children.length; startChildIndex++) {
			let child = this.context.children[startChildIndex]
			child.capturer.eliminateRepetitiveRecursively(ownHashes)
		}
	}
}