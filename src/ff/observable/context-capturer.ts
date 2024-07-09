import type TS from 'typescript'
import {PropertyAccessingNode, factory, helper, ts} from '../../base'
import {Context} from './context'
import {ContextTree, ContextType} from './context-tree'
import {VisitingTree} from './visiting-tree'
import {Interpolator, InterpolationPosition} from './interpolator'
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

	/** Transfer captured expressions to child. */
	transferToChild() {
		let captured = this.captured
		this.captured = []

		return captured
	}

	/** Capture an expression at specified position. */
	capture(index: number) {
		this.captured.push(index)
	}

	/** Insert captured expressions to specified position. */
	breakCaptured(index: number) {
		let captured = this.captured
		if (captured.length === 0) {
			return
		}

		this.captured = []

		Interpolator.addBefore(index, () => this.transferCaptured(captured))
	}

	/** Transfer captured indices to expressions. */
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
	 */
	reference(index: number) {
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
		}
	}

	/** 
	 * Add rest captured expressions before end position of context, or before a return statement.
	 * But:
	 *  - For like `return this.a`, will move `this.a` ahead.
	 *  - For like `return (ref_=a()).b`, will reference returned content and move it ahead.
	 */
	private addRestCaptured() {
		let exps = this.captured
		if (exps.length === 0) {
			return
		}

		this.captured = []

		let type = this.context.type
		let node = this.context.node
		let index = this.context.visitingIndex

		// Can put statements, insert to the end of statements.
		if (helper.canPutStatements(node)) {
			let endIndex = VisitingTree.getLastChildIndex(index)
			this.insertExpressionsAfter(endIndex, exps)
		}

		// Context doesn't make a context for non-blocked arrow function body.
		// So here need to replace arrow function body.
		else if (type === ContextType.FunctionLike && !ts.isBlock((node as TS.ArrowFunction).body)) {
			let bodyIndex = VisitingTree.getChildIndex(index, 1)
			this.insertExpressionsNormally((node as TS.ArrowFunction).body, bodyIndex, exps)
		}

		// Others.
		else {
			this.insertExpressionsNormally(node, index, exps)
		}
	}

	/** 
	 * `() => ...` -> `() => {...; return ...}`
	 * `if (...) ...` -> `if (...) {...; ...}`
	 * `... &&` -> `(...; ...) &&`
	 */
	private insertExpressionsNormally(node: TS.Node, index: number, exps: PropertyAccessingNode[]) {
		let type = this.context.type

		// `return ...`, `await ...`, `yield ...` or `() => ...`
		if (this.context.state.isBreakLikeOrImplicitReturning(node)) {
			let beFunctionBody = ts.isArrowFunction(node.parent) && !ts.isBlock(node)

			if (haveRef) {
				let refName = this.makeReferenceName()

				this.addInterpolationItem(index, {
					position: InterpolationPosition.Replace,
					contentType: InterpolationContentType.Get,
					expressions: exps,
					replace: (n: TS.Node, exps: TS.Expression[]) => {
						let nodes = [
		
							// `ref = ...`
							factory.createExpressionStatement(
								referenceBreakLikeOrImplicitReturning(n as TS.Expression, refName)
							),
	
							// Insert expressions here.
							...exps.map(exp => factory.createExpressionStatement(exp)),
	
							// `return ref`.
							replaceReferencedBreakLikeOrImplicitReturning(n as TS.Expression, refName),
						]

						if (beFunctionBody) {
							return factory.createBlock(nodes)
						}
						else {
							return nodes
						}
					},
				})
			}
			else {
				this.addInterpolationItem(index, {
					position: InterpolationPosition.Replace,
					contentType: InterpolationContentType.Get,
					expressions: exps,
					replace: (n: TS.Node, exps: TS.Expression[]) => {
						let nodes = [
		
							// Insert expressions here.
							...exps.map(exp => factory.createExpressionStatement(exp)),
	
							// return original returning, or a new returning.
							returnBreakLikeOrImplicitReturning(n as TS.Expression),
						]

						if (beFunctionBody) {
							return factory.createBlock(nodes)
						}
						else {
							return nodes
						}
					},
				})
			}
		}
		
		// `if (...)`,
		// `... ? b : c`, `... && b`, `... || b`, `... ?? b`,
		// `for (...)`, `while (...)`,
		// `a && ...`, `a || ...`, `a ?? ...`.
		else if (type === ContextType.ConditionalCondition
			|| type === ContextType.IterationCondition
			|| type === ContextType.ConditionalExpressionContent
		) {
			if (haveRef) {
				let refName = this.makeReferenceName()
	
				this.addInterpolationItem(index, {
					position: InterpolationPosition.Replace,
					contentType: InterpolationContentType.Get,
					expressions: exps,
					replace: (n: TS.Node, exps: TS.Expression[]) => {
						let exp = exps[0]

						// `a, b, c...`
						for (let i = 1; i < exps.length; i++) {
							exp = factory.createBinaryExpression(
								exp,
								factory.createToken(ts.SyntaxKind.CommaToken),
								exps[i]
							)
						}

						// `ref = ..., a, b, c, ...`
						exp = factory.createBinaryExpression(

							factory.createBinaryExpression(
								factory.createIdentifier(refName),
								factory.createToken(ts.SyntaxKind.EqualsToken),
								n as TS.Expression
							),

							factory.createToken(ts.SyntaxKind.CommaToken),
	
							// Insert expressions here.
							exp
						)

						// `(..., ref)`
						return factory.createParenthesizedExpression(
							factory.createBinaryExpression(
								exp,
								factory.createToken(ts.SyntaxKind.CommaToken),
								factory.createIdentifier(refName)
							)
						)
					},
				})
			}
			else {
				this.addInterpolationItem(index, {
					position: InterpolationPosition.Replace,
					contentType: InterpolationContentType.Get,
					expressions: exps,
					replace: (n: TS.Node, exps: TS.Expression[]) => {
						let exp = exps[0]

						// `a, b, c...`
						for (let i = 1; i < exps.length; i++) {
							exp = factory.createBinaryExpression(
								exp,
								factory.createToken(ts.SyntaxKind.CommaToken),
								exps[i]
							)
						}

						// `(..., node)`
						return factory.createParenthesizedExpression(
							factory.createBinaryExpression(
								exp,
								factory.createToken(ts.SyntaxKind.CommaToken),
								n as TS.Expression
							)
						)
					},
				})
			}
		}

		// `if ()...`, `else ...`
		else {
			this.addInterpolationItem(index, {
				position: InterpolationPosition.Replace,
				contentType: InterpolationContentType.Get,
				expressions: exps,
				replace: (node: TS.Node, exps: TS.Expression[]) => {
					return factory.createBlock([
						...exps.map(exp => factory.createExpressionStatement(exp)),
						node as TS.ExpressionStatement,
					])
				},
			})
		}
	}

}