import type TS from 'typescript'
import {ListMap} from '../../utils'
import {PropertyAccessingNode, factory, helper, ts} from '../../base'
import {Context} from './context'
import {ContextTree, ContextType} from './context-tree'
import {VisitingTree} from './visiting-tree'
import {ContextExpMaker} from './context-exp-maker'


interface InterpolationItem {

	/** Where to interpolate. */
	position: InterpolationPosition

	/** Interpolate content type. */
	contentType: InterpolationContentType

	/** If is a list and becomes empty, no need to interpolate. */
	expressions?: PropertyAccessingNode[] | TS.BinaryExpression[]

	/** Must exist for `Replace` interpolation type. */
	replace?: ((node: TS.Node, exps: TS.Expression[]) => TS.Node | TS.Node[])
}

enum InterpolationPosition {
	Replace,
	InsertBefore,
	InsertAfter,
}

enum InterpolationContentType {
	Get,
	Set,
	Reference,
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

	/** Insert captured expressions to specified position. */
	breakCaptured(index: number) {
		let exps = this.captured
		if (exps.length === 0) {
			return
		}

		this.captured = []
		this.capturedHaveRef = false
		this.insertExpressionsBefore(index, exps)
	}

	/** Insert expressions to before specified position. */
	private insertExpressionsBefore(index: number, exps: PropertyAccessingNode[]) {
		this.interpolated.add(index, {
			position: InterpolationPosition.InsertBefore,
			contentType: InterpolationContentType.Get,
			expressions: exps,
		})
	}

	/** Insert expressions to after specified position. */
	private insertExpressionsAfter(index: number, exps: PropertyAccessingNode[]) {
		this.interpolated.add(index, {
			position: InterpolationPosition.InsertAfter,
			contentType: InterpolationContentType.Get,
			expressions: exps,
		})
	}

	/** 
	 * Make a reference variable to reference a computed expression.
	 * `a.b().c` -> `var t; ... (t = a.b()).c`.
	 * Returns variable name, or `null` if cant make reference.
	 */
	private makeReference(node: TS.Node): string | null {
		let context = ContextTree.findClosestContextToAddVariable(node, this.context)
		if (!context) {
			return null
		}

		let name = context.variables.makeUniqueVariable('ref_')
		context.interpolator.addUniqueVariable(name)

		return name
	}

	/** 
	 * Add a unique variable by variable name.
	 * Current context must be a found context than can be added.
	 */
	addUniqueVariable(variableName: string) {
		this.referenceVariableNames.push(variableName)
	}

	/** 
	 * Replace like `a().b` to a reference assignment `_ref = a(); _ref.b`,
	 * and capture replaced expression.
	 */
	referenceAndCapture(node: PropertyAccessingNode, index: number) {
		let refName = this.makeReference(node)

		// Can't add reference, normally in the range of a parameter.
		// Directly capture whole expression.
		if (refName === null) {
			this.capture(node, true)
			return
		}

		let {context, index} = ContextTree.findClosestPositionToAddStatements(this.context)

		// `a.b().c`, insert `ref = a.b()` to a previous position.
		this.interpolated.add(index, {
			position: InterpolationPosition.Replace,
			contentType: InterpolationContentType.Reference,
			expressions: [
				factory.createBinaryExpression(
					factory.createIdentifier(refName),
					factory.createToken(ts.SyntaxKind.EqualsToken),
					node.expression
				)
			],
		})
		
		// `a.b().c` -> `ref_.c`
		let refAccessing = replaceReferencedPropertyAccessing(node, refName)
		this.capture(refAccessing, true)
	}

	/** Insert a reference to  */
	insertReference(index: number) {

	}

	/** 
	 * Add rest captured expressions before end position of context, or before a return statement.
	 * But:
	 *  - For like `return this.a`, will move `this.a` ahead.
	 *  - For like `return (ref_=a()).b`, will reference returned content and move it ahead.
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
			this.insertExpressionsAfter(endIndex, exps)
		}

		// Replace arrow function body.
		else if (type === ContextType.FunctionLike) {
			let bodyIndex = VisitingTree.getChildIndexBySiblingIndex(index, 1)
			this.insertExpressionsNormally((node as TS.ArrowFunction).body, bodyIndex, exps, haveRef)
		}

		// Others.
		else {
			this.insertExpressionsNormally(node, index, exps, haveRef)
		}
	}

	/** 
	 * `() => ...` -> `() => {...; return ...}`
	 * `if (...) ...` -> `if (...) {...; ...}`
	 * `... &&` -> `(...; ...) &&`
	 */
	private insertExpressionsNormally(
		node: TS.Node, index: number, exps: PropertyAccessingNode[], haveRef: boolean
	) {
		let type = this.context.type

		// `return ...`, `await ...`, `yield ...` or `() => ...`
		if (this.context.state.isBreakLikeOrImplicitReturning(node)) {
			let beFunctionBody = ts.isArrowFunction(node.parent) && !ts.isBlock(node)

			if (haveRef) {
				let refName = this.makeReference()

				this.interpolated.add(index, {
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
				this.interpolated.add(index, {
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
				let refName = this.makeReference()
	
				this.interpolated.add(index, {
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
				this.interpolated.add(index, {
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
			this.interpolated.add(index, {
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

	/** Output expressions to insert before specified index. */
	output(node: TS.Node | TS.Node[], index: number): TS.Node | TS.Node[] {
		
		if (node === this.context.node && VisitingTree.getSiblingIndex(index) === 0) {

		}

		let items = this.interpolated.get(index)
		if (!items) {
			return node
		}

		for (let item of items) {
			let type = item.position
			let contentType = item.contentType
			let exps = item.expressions

			// Exps may get clear after optimizing.
			if (exps && exps.length === 0) {
				continue
			}

			let madeExps: TS.Expression[]

			if (contentType === InterpolationContentType.Reference) {
				madeExps = exps as TS.BinaryExpression[]
			}
			else {
				madeExps = exps ? ContextExpMaker.makeExpressions(exps as PropertyAccessingNode[]) : []
			}

			if (type === InterpolationPosition.Replace) {
				if (Array.isArray(node)) {
					throw new Error(`"Replace" type of interpolation must be the first!`)
				}

				node = item.replace!(node, madeExps)
				continue
			}

			let madeStatements = madeExps.map(exp => factory.createExpressionStatement(exp))
			if (type === InterpolationPosition.InsertBefore) {
				node = [madeStatements, node].flat()
			}
			else {
				node = [node, madeStatements].flat()
			}
		}

		return Array.isArray(node) && node.length === 1 ? node[0] : node
	}

	private outputReferenceVariables(node: TS.Node, index: number): TS.VariableStatement | null {
		if (this.referenceVariableNames.length === 0) {
			return null
		}

		// Must be the first child.
		if (this.context.state.isStatementsCanPut()) {
			if (node.parent !== this.context.node
				|| VisitingTree.getSiblingIndex(index) !== 0
			) {
				return null
			}
		}
	}
}