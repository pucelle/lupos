import type TS from 'typescript'
import {InterpolationContentType, AccessNode, helper, interpolator, modifier, InterpolationPosition} from '../../base'
import {Context} from './context'
import {ContextTree, ContextType} from './context-tree'
import {AccessGrouper} from './access-grouper'
import {AccessReferences} from './access-references'
import {Optimizer} from './optimizer'


/** Captured item, will be inserted to a position. */
interface CapturedItem {
	position: InterpolationPosition
	indices: number[]
	toIndex: number
}


/** 
 * It attaches to each context,
 * Captures get and set expressions, and remember reference variables.
 */
export class ContextCapturer {

	readonly context: Context
	private variableNames: string[] = []
	private captured: CapturedItem[]
	private latestCaptured!: CapturedItem
	private captureType: 'get' | 'set' = 'get'

	constructor(context: Context) {
		this.context = context

		this.resetLatestCaptured()
		this.captured = [this.latestCaptured]
		this.transferFromParent()
	}

	private resetLatestCaptured() {
		this.latestCaptured = {
			position: InterpolationPosition.Before,
			indices: [],
			toIndex: -1,
		}
	}

	/** Transfer from some captured properties to child. */
	private transferFromParent() {
		let parent = this.context.parent
		if (!parent) {
			return
		}

		// Broadcast down capture type within a function-like context.
		if (parent.type !== ContextType.FunctionLike) {
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

	/** Move all captured to target capturer. */
	moveCapturedAheadOf(toCapturer: ContextCapturer) {
		let indices = this.captured.map(item => item.indices).flat()
		this.captured = []

		// Insert to the first of internal captured.
		toCapturer.captured[0].indices.unshift(...indices)
	}

	/** Move all captured to an ancestral, target capturer. */
	moveCapturedUpward(toCapturer: ContextCapturer) {
		let indices = this.captured.map(item => item.indices).flat()
		this.captured = []

		let item = toCapturer.captured.find(item => item.toIndex === this.context.visitingIndex)
		if (item) {
			item.indices.push(...indices)
		}
		else {
			item = {
				position: InterpolationPosition.Before,
				indices,
				toIndex: this.context.visitingIndex,
			}
		}
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
	breakCaptured(atIndex: number) {
		// Even no indices captured, still break.
		// Later may append indices to this item.

		this.latestCaptured.toIndex = atIndex
		this.resetLatestCaptured()
		this.captured.push(this.latestCaptured)
	}

	/** 
	 * Add a unique variable by variable name.
	 * Current context must be a found context than can be added.
	 */
	addUniqueVariable(variableName: string) {
		this.variableNames.push(variableName)
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

		// Insert before whole content of target capturer.
		if (this.context.type === ContextType.FlowInterruptWithContent) {
			item.position = InterpolationPosition.Before
		}

		// Insert before whole content of target capturer.
		else if (this.context.type === ContextType.ConditionalCondition
			&& this.context.parent!.type === ContextType.ConditionalAndContent
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

		modifier.addVariables(this.context.visitingIndex, this.variableNames)
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
}