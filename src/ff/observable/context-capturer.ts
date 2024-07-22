import type TS from 'typescript'
import {InterpolationContentType, AccessNode, helper, interpolator, modifier} from '../../base'
import {Context} from './context'
import {ContextTree, ContextType} from './context-tree'
import {AccessGrouper} from './access-grouper'
import {ListMap} from '../../utils'
import {AccessReferences} from './access-references'


/** 
 * It attaches to each context,
 * Captures get and set expressions, and remember reference variables.
 */
export class ContextCapturer {

	readonly context: Context
	private variableNames: string[] = []
	private captured: ListMap<number, number> = new ListMap()
	private latestCaptured: number[] = []
	private captureType: 'get' | 'set' = 'get'

	constructor(context: Context) {
		this.context = context
		this.transferFromParent()
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
		this.latestCaptured.push(index)
	}

	/** Cancel capturing an index. */
	unCapture(index: number) {
		for (let key of [...this.captured.keys()]) {
			if (this.captured.has(key, index)) {
				this.captured.delete(key, index)
				return
			}
		}

		let spliceIndex = this.latestCaptured.indexOf(index)
		if (spliceIndex > -1) {
			this.latestCaptured.splice(spliceIndex, 1)
		}
	}

	/** Every time capture a new index, check type and may toggle capture type. */
	private addCaptureType(type: 'get' | 'set') {
		if (type === 'set' && this.captureType === 'get') {

			// Broadcast to closest function-like context, and broadcast down.
			let walking = ContextTree.walkInward(
				this.context.closestFunctionLike,
				c => c.capturer.captureType === 'get'
			)
			
			for (let descent of walking) {
				descent.capturer.applySetCaptureTpe()
			}
		}
	}

	/** Apply capture type to `set`. */
	private applySetCaptureTpe() {
		this.captureType = 'set'
		this.captured.clear()
		this.latestCaptured = []
	}

	/** Insert captured indices to specified position. */
	breakCaptured(atIndex: number) {
		let captured = this.latestCaptured
		if (captured.length === 0) {
			return
		}

		this.latestCaptured = []
		this.captured.set(atIndex, captured)
	}

	/** Insert captured indices to specified position. */
	addCapturedManually(index: number, atIndex: number, type: 'get' | 'set') {
		this.addCaptureType(type)
		this.captured.add(atIndex, index)
	}

	/** 
	 * Add a unique variable by variable name.
	 * Current context must be a found context than can be added.
	 */
	addUniqueVariable(variableName: string) {
		this.variableNames.push(variableName)
	}

	/** Before context will exit. */
	beforeExit() {
		if (this.context === this.context.closestFunctionLike) {
			let walking = ContextTree.walkInward(
				this.context.closestFunctionLike,
				c => c.closestFunctionLike === this.context
			)

			for (let descent of walking) {

				// First order is important, checking references step may
				// add more variables, and adjust captured.
				descent.capturer.checkReferences()

				descent.capturer.interpolateVariables()
				descent.capturer.interpolateCaptured()
			}
		}
	}

	/** Check captured indices and reference if possible. */
	private checkReferences() {
		for (let index of this.captured.values()) {
			AccessReferences.mayReferenceAccess(index, this.captureType, this.context)
		}

		for (let index of this.latestCaptured) {
			AccessReferences.mayReferenceAccess(index, this.captureType, this.context)
		}

		// Move variable declaration list forward.
		// TODO: Should move codes to optimize step later.
		if ((this.captured.keyCount() > 0 || this.latestCaptured.length > 0)
			&& this.context.type === ContextType.IterationInitializer) {
			let toPosition = ContextTree.findClosestPositionToAddStatement(
				this.context.visitingIndex, this.context
			)

			modifier.moveOnce(this.context.visitingIndex, toPosition.index)
		}

		// Transfer from function parameters to function body.
		// if (this.context.parent?.type === ContextType.FunctionLike) {
		// 	this.captured.add()
		// 	modifier.moveOnce(this.context.visitingIndex, toPosition.index)
		// }
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
		// TODO
		if (this.context.type === ContextType.FunctionLike) {
			return
		}

		for (let [atIndex, captured] of this.captured.entries()) {
			interpolator.before(atIndex, InterpolationContentType.Tracking, () => this.outputCaptured(captured))
			AccessGrouper.addImport(this.captureType)
		}

		this.captured.clear()
		this.interpolateRestCaptured()
	}

	/** 
	 * Add rest captured expressions before end position of context, or before a return statement.
	 * But:
	 *  - For like `return this.a`, will move `this.a` ahead.
	 *  - For like `return (_ref_=a()).b`, will reference returned content and move it ahead.
	 */
	private interpolateRestCaptured() {
		if (this.latestCaptured.length === 0) {
			return
		}

		let captured = this.latestCaptured
		let node = this.context.node
		let index = this.context.visitingIndex

		this.latestCaptured = []

		// Can put statements, insert to the end of statements.
		if (helper.pack.canPutStatements(node)) {
			interpolator.append(index, InterpolationContentType.Tracking, () => this.outputCaptured(captured))
		}

		// insert after current index, and process later.
		else {
			interpolator.after(index, InterpolationContentType.Tracking, () => this.outputCaptured(captured))
		}

		AccessGrouper.addImport(this.captureType)
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