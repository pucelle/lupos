import type TS from 'typescript'
import {PropertyAccessingNode, factory, helper, ts} from '../../base'
import {Context} from './context'
import {ContextPosition, ContextTree, ContextType} from './context-tree'
import {VisitingTree} from './visiting-tree'
import {Interpolator} from './interpolator'
import {ContextAccessingGrouper} from './context-accessing-grouper'


/** 
 * It attaches to each context,
 * Captures get and set expressions, and remember reference variables.
 */
export class ContextCapturer {

	readonly context: Context
	private referenceVariableNames: string[] = []
	private captured: number[] = []

	constructor(context: Context) {
		this.context = context
		this.mayTransferFromParent()
	}

	/** Transfer from function parameters to function body. */
	private mayTransferFromParent() {
		let parent = this.context.parent
		if (!parent) {
			return
		}

		if (parent.type === ContextType.FunctionLike
			&& this.context.type === ContextType.BlockLike
		) {
			let captured = parent.capturer.transferToChild()
			this.captured = captured
		}
	}

	/** Transfer captured indices to child. */
	transferToChild() {
		let captured = this.captured
		this.captured = []

		return captured
	}

	/** Capture an index at specified position. */
	capture(index: number) {
		this.captured.push(index)
	}

	/** Insert captured indices to specified position. */
	breakCaptured(atIndex: number) {
		let captured = this.captured
		if (captured.length === 0) {
			return
		}

		this.captured = []
		this.addCapturedIndices(atIndex, captured)
	}

	/** Insert specified captured indices to specified position. */
	addCapturedIndices(atIndex: number, captured: number[]) {
		Interpolator.addBefore(atIndex, () => this.transferCaptured(captured))
	}

	/** Transfer specified indices to specified position. */
	private transferCaptured(captured: number[]): TS.Expression[] {
		let exps = captured.map(i => {
			let node = Interpolator.outputChildren(i) as PropertyAccessingNode
			let exp = node.expression
			let name = helper.getPropertyAccessingName(node)
			let changed = false

			// Normally for `a().b` -> `(_ref_ = a(), _ref_).b`
			if (ts.isParenthesizedExpression(exp)) {
				exp = helper.extractFinalFromParenthesizeExpression(exp) as TS.LeftHandSideExpression
				changed = true
			}

			if (ts.isParenthesizedExpression(name)) {
				name = helper.extractFinalFromParenthesizeExpression(name)
				changed = true
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

		return ContextAccessingGrouper.makeGetExpressions(exps)
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
	reference(index: number): ContextPosition | null {
		let refName = this.makeReferenceName()
		let position = ContextTree.findClosestPositionToMoveStatements(index, this.context)

		// Can move statements.
		// Still have risk for exps like: `(a = b, a.c().d)`
		if (position) {

			// insert `_ref_ = a.b()` or `_ref_ = b++` to found position.
			let expIndex = VisitingTree.getFirstChildIndex(index)
			Interpolator.addStatementReference(position.index, expIndex, refName)

			// replace `a.b()` -> `_ref_`.
			Interpolator.addReplace(expIndex, () => factory.createIdentifier(refName))
		}

		// replace `a.b()` to `(_ref_ = a.b(), _ref_)`.
		// Later when inserting captured expressions, must remove the parenthesized.
		else {
			Interpolator.addParenthesizedReference(index, refName)
		}

		return position
	}

	/** 
	 * Make a reference variable to reference a complex expression.
	 * `a.b().c` -> `var _ref_; ... _ref_ = a.b(); _ref_.c`.
	 * Returns variable name, or `null` if cant make reference.
	 */
	private makeReferenceName(): string {
		let context = ContextTree.findClosestContextToAddVariable(this.context)
		let name = context.variables.makeUniqueVariable('ref_')
		context.capturer.addUniqueVariable(name)

		return name
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
		this.addRestCaptured()
	}

	/** Add reference variables as declaration statements. */
	private addReferenceVariables() {
		if (this.referenceVariableNames.length > 0) {
			Interpolator.addVariables(this.context.visitingIndex, this.referenceVariableNames)
			this.referenceVariableNames = []
		}
	}

	/** 
	 * Add rest captured expressions before end position of context, or before a return statement.
	 * But:
	 *  - For like `return this.a`, will move `this.a` ahead.
	 *  - For like `return (ref_=a()).b`, will reference returned content and move it ahead.
	 */
	private addRestCaptured() {
		let captured = this.captured
		if (captured.length === 0) {
			return
		}

		this.captured = []

		let node = this.context.node
		let index = this.context.visitingIndex

		// Can put statements, insert to the end of statements.
		if (helper.canPutStatements(node)) {
			let endIndex = VisitingTree.getLastChildIndex(index)
			Interpolator.addAfter(endIndex, () => this.transferCaptured(captured))
		}

		// insert after current index, and process later.
		else {
			Interpolator.addAfter(index, () => this.transferCaptured(captured))
		}
	}
}