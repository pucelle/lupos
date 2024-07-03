import type TS from 'typescript'
import {ListMap} from '../../utils'
import {PropertyAccessingNode, factory, helper, ts} from '../../base'
import {Context} from './context'
import {ContextType} from './context-tree'
import {VisitingTree} from './visiting-tree'
import {ContextExpMaker} from './context-exp-maker'
import {isBreakLikeOrImplicitReturning, refBreakLikeOrImplicitReturning, refPropertyAccessing, replaceRefedBreakLikeOrImplicitReturning, replaceRefedPropertyAccessing, returnBreakLikeOrImplicitReturning} from './helpers/ref'


interface InterpolationItem {

	// If is a list and becomes empty, no need to replace.
	exps: PropertyAccessingNode[] | null

	replace: (node: TS.Node, exps: TS.Expression[]) => TS.Node | TS.Node[]
}


/** 
 * It attaches to each context.
 * Remember where to insert expressions, and interpolate there some contents.
 */
export class ContextInterpolator {

	readonly context: Context
	private referenceVariableNames: string[] = []
	private captured: PropertyAccessingNode[] = []
	private capturedHaveRef: boolean = false

	/** Interpolated expressions. */
	private interpolated: ListMap<number, InterpolationItem> = new ListMap()

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
			let {captured, capturedHaveRef} = parent.interpolator.transferToChild()
			this.captured = captured
			this.capturedHaveRef = capturedHaveRef
		}
	}

	/** Transfer captured expressions to child. */
	transferToChild() {
		let captured = this.captured
		let capturedHaveRef = this.capturedHaveRef

		this.captured = []
		this.capturedHaveRef = false

		return {
			captured,
			capturedHaveRef,
		}
	}

	/** Capture an expression. */
	capture(exp: PropertyAccessingNode, hasRef: boolean) {
		this.captured.push(exp)
		this.capturedHaveRef ||= hasRef
	}

	/** Insert captured expressions to currently visiting position. */
	breakCaptured(index: number) {
		let exps = this.captured
		if (exps.length === 0) {
			return
		}

		this.captured = []
		this.capturedHaveRef = false
		this.insertExpsBefore(index, exps)
	}

	/** Insert expressions to before specified position. */
	private insertExpsBefore(index: number, exps: PropertyAccessingNode[]) {
		this.interpolated.add(index, {
			exps,
			replace: (node: TS.Node, exps: TS.Expression[]) => {
				return [
					...exps.map(exp => factory.createExpressionStatement(exp)),
					node,
				]
			},
		})
	}

	/** Insert expressions to after specified position. */
	private insertExpsAfter(index: number, exps: PropertyAccessingNode[]) {
		this.interpolated.add(index, {
			exps,
			replace: (node: TS.Node, exps: TS.Expression[]) => {
				return [
					node,
					...exps.map(exp => factory.createExpressionStatement(exp)),
				]
			},
		})
	}

	/** 
	 * Make a reference variable to reference a computed expression.
	 * `a.b().c` -> `var t; ... (t = a.b()).c`.
	 * Returns variable name.
	 */
	private makeRefVariable(): string {
		let name = this.context.variables.makeVariable('ref_')
		this.referenceVariableNames.push(name)

		return name
	}

	/** 
	 * Replace like `a().b` to a reference assignment `(c = a()).b`,
	 * and capture replaced expression.
	 */
	refAndCapture(node: PropertyAccessingNode, index: number) {
		let refName = this.makeRefVariable()

		this.interpolated.add(index, {
			exps: null,
			replace: (node: TS.Node) => {
				return refPropertyAccessing(node as PropertyAccessingNode, refName)
			},
		})
		
		// `a.b().c` -> `_ref_.c`
		let referenceAccessing = replaceRefedPropertyAccessing(node, refName)
		this.capture(referenceAccessing, true)
	}


	/** 
	 * Add rest captured expressions before end position of context, or before a return statement.
	 * But:
	 *  - For like `return this.a`, will move `this.a` ahead.
	 *  - For like `return (_ref=a()).b`, will reference returned content and move it ahead.
	 */
	insertRestCaptured() {
		let exps = this.captured
		let haveRef = this.capturedHaveRef
		if (exps.length === 0) {
			return
		}

		this.captured = []
		this.capturedHaveRef = false

		let type = this.context.type
		let node = this.context.node
		let index = this.context.visitingIndex

		// Insert to the end of statements.
		// For block, source file, case or default.
		if (helper.isStatementsExist(node)) {
			let endIndex = VisitingTree.getLastChildIndex(index)
			this.insertExpsAfter(endIndex, exps)
		}

		// Replace arrow function body.
		else if (type === ContextType.FunctionLike) {
			let bodyIndex = VisitingTree.getChildIndexBySiblingIndex(index, 1)
			this.insertExpsAndBlockIt((node as TS.ArrowFunction).body, bodyIndex, exps, haveRef)
		}

		// Other contents.
		else {
			this.insertExpsAndBlockIt(node, index, exps, haveRef)
		}
	}

	/** 
	 * `() => ...` -> `() => {...; return ...}`
	 * `if (...) ...` -> `if (...) {...; ...}`
	 */
	private insertExpsAndBlockIt(
		node: TS.Node, index: number, exps: PropertyAccessingNode[], haveRef: boolean
	) {
		let type = this.context.type

		// `return ...`, `await ...`, `yield ...` or `() => ...`
		if (isBreakLikeOrImplicitReturning(node)) {
			if (haveRef) {
				let refName = this.makeRefVariable()
	
				this.interpolated.add(index, {
					exps,
					replace: (n: TS.Node, exps: TS.Expression[]) => {
						return factory.createBlock([
		
							// `_ref = ...`
							factory.createExpressionStatement(
								refBreakLikeOrImplicitReturning(n as TS.Expression, refName)
							),
	
							// Insert expressions here.
							...exps.map(exp => factory.createExpressionStatement(exp)),
	
							// `return _ref`.
							replaceRefedBreakLikeOrImplicitReturning(n as TS.Expression, refName),
						])
					},
				})
			}
			else {
				this.interpolated.add(index, {
					exps,
					replace: (n: TS.Node, exps: TS.Expression[]) => {
						return factory.createBlock([
		
							// Insert expressions here.
							...exps.map(exp => factory.createExpressionStatement(exp)),
	
							// return original returning, or a new returning.
							returnBreakLikeOrImplicitReturning(n as TS.Expression),
						])
					},
				})
			}
		}
		
		// `if (...)`, `... ? b : c`, `... && b`, `... || b`, `... ?? b`, `for (...)`, `while (...)`.
		else if (type === ContextType.ConditionalCondition || type === ContextType.IterationCondition) {
			if (haveRef) {
				let refName = this.makeRefVariable()
	
				this.interpolated.add(index, {
					exps,
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

						// `_ref = ..., a, b, c, ...`
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

						// `(..., _ref)`
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
				this.interpolated.add(index, {
					exps,
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

		// `if ()...`
		else {
			this.interpolated.add(index, {
				exps,
				replace: (node: TS.Node, exps: TS.Expression[]) => {
					return factory.createBlock([
						...exps.map(exp => factory.createExpressionStatement(exp)),
						node as TS.ExpressionStatement,
					])
				},
			})
		}
	}

	/** Output get expressions to insert before specified index. */
	output(node: TS.Node, index: number): TS.Node | TS.Node[] {
		let items = this.interpolated.get(index)
		if (!items) {
			return node
		}

		let nodes = [node]

		for (let item of items) {
			let exps = item.exps

			// Exps get clear after optimizing.
			if (exps && exps.length === 0) {
				continue
			}

			let madeExps = exps ? ContextExpMaker.makeExpressions(exps) : []
			let lastNode = nodes.pop()!
			let replacedExps = item.replace(lastNode, madeExps)

			if (Array.isArray(replacedExps)) {
				nodes.push(...replacedExps)
			}
			else {
				nodes.push(replacedExps)
			}
		}

		return nodes.length === 1 ? nodes[0] : nodes
	}
}