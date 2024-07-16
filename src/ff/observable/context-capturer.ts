import type TS from 'typescript'
import {InterpolationContentType, PropertyAccessNode, factory, helper, interpolator, modifier, ts, visiting} from '../../base'
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
		this.transferCapturingFromParent()
	}

	/** Transfer from some captured properties to child. */
	private transferCapturingFromParent() {
		let parent = this.context.parent
		if (!parent) {
			return
		}

		// Transfer from function parameters to function body.
		if (parent.type === ContextType.FunctionLike
			&& this.context.type === ContextType.BlockLike
		) {
			let captured = parent.capturer.transferCapturedToChild()
			this.latestCaptured = captured
		}

		// Broadcast down capture type within a function-like context.
		if (parent.type !== ContextType.FunctionLike) {
			this.captureType = parent.capturer.captureType
		}
	}

	/** Transfer captured indices to child. */
	transferCapturedToChild() {
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
			this.broadcastSetCaptureType()
		}
	}

	/** Broadcast to closest ancestral function-like capturer. */
	private broadcastSetCaptureType() {
		let closestFunctionLikeOrSelf = this.findClosestFunctionLike() || this
		
		for (let descent of closestFunctionLikeOrSelf.walkSelfAndNonSetCaptureType()) {
			descent.captureType = 'set'
			descent.captured = new Map()
			descent.latestCaptured = []
		}
	}

	/** Find closest ancestral function-like capturer. */
	private findClosestFunctionLike(): ContextCapturer | null {
		let context: Context | null = this.context
		
		while (context && context.type !== ContextType.FunctionLike) {
			context = context.parent
		}

		return context ? context.capturer : null
	}

	/** Walk self and descendant capturers, and exclude set type capturers. */
	private *walkSelfAndNonSetCaptureType(): Iterable<ContextCapturer> {
		yield this

		for (let child of this.context.children) {
			if (child.capturer.captureType === 'set') {
				continue
			}

			yield *child.capturer.walkSelfAndNonSetCaptureType()
		}
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

	/** Insert specified captured indices to specified position. */
	manuallyAddCaptured(captured: number[], atIndex: number, type: 'get' | 'set') {
		this.addCaptureType(type)

		if (this.captured.has(atIndex)) {
			this.captured.get(atIndex)!.push(...captured)
		}
		else {
			this.captured.set(atIndex, captured)
		}
	}

	/** Transfer specified indices to specified position. */
	private transferCaptured(captured: number[]): TS.Expression[] {
		let exps = captured.map(i => {
			let node = interpolator.outputChildren(i) as PropertyAccessNode
			let exp = node.expression
			let name = helper.access.getNameNode(node)
			let changed = false

			// Normally for `a().b` -> `(_ref_ = a(), _ref_).b`, extract `_ref_.b`.
			if (ts.isParenthesizedExpression(exp)) {
				let extracted = helper.pack.extractFinalParenthesized(exp)
				if (extracted !== exp) {
					exp = extracted as TS.LeftHandSideExpression
					changed = true
				}
			}

			if (ts.isParenthesizedExpression(name)) {
				let extracted = helper.pack.extractFinalParenthesized(name)
				if (extracted !== name) {
					name = extracted
					changed = true
				}
			}

			if (!changed) {
				return node
			}

			if (ts.isPropertyAccessExpression(node)) {
				return factory.createPropertyAccessExpression(exp, name as TS.MemberName)
			}
			else {
				return factory.createElementAccessExpression(exp, name)
			}
		})

		return AccessGrouper.makeExpressions(exps, this.captureType)
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
		this.addReferenceVariables()

		// Add captured to interpolator after known capture type of closest ancestral function-like.
		// For source file should also add captured when for not contained by function-like context.
		if (this.context.type === ContextType.FunctionLike
			|| ts.isSourceFile(this.context.node)
		) {
			for (let descent of this.walkSelfAndNonFunctionLikeDescendants()) {
				descent.addCaptured()
				descent.addRestCaptured()
			}
		}
	}

	/** Walk self and descendant capturers, and exclude function like capturers. */
	private *walkSelfAndNonFunctionLikeDescendants(): Iterable<ContextCapturer> {
		yield this

		for (let child of this.context.children) {
			if (child.type === ContextType.FunctionLike) {
				continue
			}

			yield *child.capturer.walkSelfAndNonFunctionLikeDescendants()
		}
	}

	/** Add reference variables as declaration statements. */
	private addReferenceVariables() {
		if (this.referenceVariableNames.length > 0) {
			modifier.addVariables(this.context.visitingIndex, this.referenceVariableNames)
			this.referenceVariableNames = []
		}
	}

	/** Add `captured` as interpolation items. */
	private addCaptured() {
		for (let [atIndex, captured] of this.captured.entries()) {
			interpolator.before(atIndex, InterpolationContentType.Tracking, () => this.transferCaptured(captured))
		}

		this.addRestCaptured()
	}

	/** 
	 * Add rest captured expressions before end position of context, or before a return statement.
	 * But:
	 *  - For like `return this.a`, will move `this.a` ahead.
	 *  - For like `return (_ref_=a()).b`, will reference returned content and move it ahead.
	 */
	private addRestCaptured() {
		let captured = this.latestCaptured
		if (captured.length === 0) {
			return
		}

		this.latestCaptured = []

		let node = this.context.node
		let index = this.context.visitingIndex

		// Can put statements, insert to the end of statements.
		if (helper.pack.canPutStatements(node)) {
			interpolator.append(index, InterpolationContentType.Tracking, () => this.transferCaptured(captured))
		}

		// insert after current index, and process later.
		else {
			interpolator.after(index, InterpolationContentType.Tracking, () => this.transferCaptured(captured))
		}
	}
}