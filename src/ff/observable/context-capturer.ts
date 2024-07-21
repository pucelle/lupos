import type TS from 'typescript'
import {InterpolationContentType, AccessNode, factory, helper, interpolator, modifier, ts, visiting} from '../../base'
import {Context} from './context'
import {ContextTargetPosition, ContextTree, ContextType} from './context-tree'
import {AccessGrouper} from './access-grouper'


/** 
 * It attaches to each context,
 * Captures get and set expressions, and remember reference variables.
 */
export class ContextCapturer {

	readonly context: Context
	private referenceVariableNames: string[] = []
	private captured: Map<number, number[]> = new Map()
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

		// Transfer from function parameters to function body.
		if (parent.type === ContextType.FunctionLike
			&& this.context.type === ContextType.BlockLike
		) {
			let captured = parent.capturer.transferLatestCapturedToChild()
			this.latestCaptured = captured
		}

		// Broadcast down capture type within a function-like context.
		if (parent.type !== ContextType.FunctionLike) {
			this.captureType = parent.capturer.captureType
		}
	}

	/** Transfer captured indices to child. */
	transferLatestCapturedToChild() {
		let captured = this.latestCaptured
		this.latestCaptured = []

		return captured
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

	/** Capture an index at specified position. */
	capture(index: number, type: 'get' | 'set') {
		this.addCaptureType(type)
		this.latestCaptured.push(index)
	}

	/** Every time capture a new index, check type and may toggle capture type. */
	private addCaptureType(type: 'get' | 'set') {
		if (type === 'set' && this.captureType === 'get') {

			// Broadcast to closest function-like context, and broadcast down.
			let walking = this.context.closestFunctionLike
				.walkInward(c => c.capturer.captureType === 'get')
			
			for (let descent of walking) {
				descent.capturer.applySetCaptureTpe()
			}
		}
	}

	/** Apply capture type to `set`. */
	private applySetCaptureTpe() {
		this.captureType = 'set'
		this.captured = new Map()
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
	addCapturedManually(captured: number[], atIndex: number, type: 'get' | 'set') {
		this.addCaptureType(type)

		if (this.captured.has(atIndex)) {
			this.captured.get(atIndex)!.push(...captured)
		}
		else {
			this.captured.set(atIndex, captured)
		}
	}

	/** 
	 * Reference a complex expression to become a reference variable.
	 * 
	 * e.g.:
	 * 	   `a.b().c`-> `_ref_ = a.b(); ... _ref_`
	 *     `a[b++]` -> `_ref_ = b++; ... a[_ref_]`
	 * 
	 * Return reference position.
	 */
	reference(index: number): ContextTargetPosition {
		let varPosition = ContextTree.findClosestPositionToAddVariable(index, this.context)
		let refName = varPosition.context.variables.makeUniqueVariable('_ref_')

		// Insert one: `var ... _ref_ = ...`
		if (ts.isVariableDeclaration(visiting.getNode(varPosition.index))) {
			
			// insert `var _ref_ = a.b()` to found position.
			modifier.addVariableAssignmentToList(index, varPosition.index, refName)

			// replace `a.b()` -> `_ref_`.
			interpolator.replace(index, InterpolationContentType.Reference, () => factory.createIdentifier(refName))

			return varPosition
		}

		// Insert two: `var _ref_`, and `_ref_ = ...`
		else {
			varPosition.context.capturer.addUniqueVariable(refName)

			let refPosition = ContextTree.findClosestPositionToAddStatement(index, this.context)

			// insert `_ref_ = a.b()` to found position.
			modifier.addReferenceAssignment(index, refPosition.index, refName)

			// replace `a.b()` -> `_ref_`.
			interpolator.replace(index, InterpolationContentType.Reference, () => factory.createIdentifier(refName))

			return refPosition
		}
	}

	/** 
	 * Add a unique variable by variable name.
	 * Current context must be a found context than can be added.
	 */
	addUniqueVariable(variableName: string) {
		this.referenceVariableNames.push(variableName)
	}

	/** Before context will exit. */
	beforeExit() {
		this.interpolateReferenceVariables()
		this.interpolateCapturedInward()
	}

	/** Add reference variables as declaration statements. */
	private interpolateReferenceVariables() {
		if (this.referenceVariableNames.length === 0) {
			return
		}

		modifier.addVariables(this.context.visitingIndex, this.referenceVariableNames)
		this.referenceVariableNames = []
	}

	/** Add captured to interpolator after known capture type of closest ancestral function-like. */
	private interpolateCapturedInward() {

		// For source file should also interpolate captured
		// for those not been contained by function-like context.
		if (this.context === this.context.closestFunctionLike) {
			let walking = this.context.closestFunctionLike
				.walkInward(c => c.closestFunctionLike === this.context)

			for (let descent of walking) {
				descent.capturer.interpolateCaptured()
			}
		}
	}

	/** Add `captured` as interpolation items. */
	private interpolateCaptured() {
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