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
		this.addCapturedTo(captured, atIndex)
	}

	/** Insert specified captured indices to specified position. */
	addCapturedTo(captured: number[], atIndex: number) {
		interpolator.before(atIndex, InterpolationContentType.Tracking, () => this.transferCaptured(captured))
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
				exp = helper.pack.extractFinalParenthesized(exp) as TS.LeftHandSideExpression
				changed = true
			}

			if (ts.isParenthesizedExpression(name)) {
				name = helper.pack.extractFinalParenthesized(name)
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

		return AccessGrouper.makeGetExpressions(exps)
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
		this.addRestCaptured()
	}

	/** Add reference variables as declaration statements. */
	private addReferenceVariables() {
		if (this.referenceVariableNames.length > 0) {
			modifier.addVariables(this.context.visitingIndex, this.referenceVariableNames)
			this.referenceVariableNames = []
		}
	}

	/** 
	 * Add rest captured expressions before end position of context, or before a return statement.
	 * But:
	 *  - For like `return this.a`, will move `this.a` ahead.
	 *  - For like `return (_ref_=a()).b`, will reference returned content and move it ahead.
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
		if (helper.pack.canPutStatements(node)) {
			interpolator.append(index, InterpolationContentType.Tracking, () => this.transferCaptured(captured))
		}

		// insert after current index, and process later.
		else {
			interpolator.after(index, InterpolationContentType.Tracking, () => this.transferCaptured(captured))
		}
	}
}