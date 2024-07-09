import type TS from 'typescript'
import {ListMap} from '../../utils'
import {PropertyAccessingNode, factory, helper, modifier, ts} from '../../base'
import {ContextTree, ContextType} from './context-tree'
import {VisitingTree} from './visiting-tree'
import {ContextAccessingGrouper} from './context-accessing-grouper'


export interface InterpolationItem {

	/** Where to interpolate. */
	position: InterpolationPosition

	/** 
	 * Must exist for `InsertBefore` or `InsertAfter` interpolation positions.
	 * If is a list and becomes empty, no need to interpolate.
	 */
	expressions?: () => TS.Expression | TS.Expression[] | TS.Statement | TS.Statement[]

	/** Must exist for `Replace` interpolation type. */
	replace?: () => TS.Node
}

export enum InterpolationPosition {
	Replace,
	InsertBefore,
	InsertAfter,
}


/** 
 * It attaches to each context.
 * Remember where to interpolate expressions, and interpolate there some contents.
 * 
 * Why interpolator is a global class:
 * Some expressions may have been moved to another position,
 * before inserting them, we still want want them to be replaced.
 * e.g.: `a.b(c.d().e)`, `c.d()` will be referenced.
 * So the whole expression should be replaced and then do inserting.
 */
export namespace Interpolator {

	/** Interpolated expressions, and where to interpolate. */
	const interpolations: ListMap<number, InterpolationItem> = new ListMap()


	/** Initialize after enter a new source file */
	export function initialize() {
		interpolations.clear()
	}


	/** 
	 * Insert a reference expression to specified index.
	 * `a.b()` -> `_ref_ = a.b()`, and move it.
	 */
	export function addStatementReference(toIndex: number, fromIndex: number, refName: string) {
		interpolations.add(toIndex, {
			position: InterpolationPosition.InsertBefore,
			expressions: () => {
				let fromNode = outputChildren(fromIndex) as TS.Expression

				return factory.createBinaryExpression(
					factory.createIdentifier(refName),
					factory.createToken(ts.SyntaxKind.EqualsToken),
					fromNode
				)
			},
		})
	}

	/** 
	 * Insert a reference expression to specified index.
	 * `a.b()` -> `(_ref_ = a.b(), _ref_)`.
	 */
	export function addParenthesizedReference(index: number, refName: string) {
		interpolations.add(index, {
			position: InterpolationPosition.Replace,
			expressions: () => {
				let node = outputChildren(index) as TS.Expression

				return modifier.parenthesizeExpressions(
					factory.createBinaryExpression(
						factory.createIdentifier(refName),
						factory.createToken(ts.SyntaxKind.EqualsToken),
						node
					),
					factory.createIdentifier(refName)
				)
			},
		})
	}

	/** Replace node at specified index to another. */
	export function addReplace(index: number, replace: () => TS.Node) {
		interpolations.add(index, {
			position: InterpolationPosition.Replace,
			replace,
		})
	}

	/** Insert expressions to before specified position. */
	export function addBefore(index: number, exps: () => TS.Expression | TS.Expression[] | TS.Statement | TS.Statement[]) {
		interpolations.add(index, {
			position: InterpolationPosition.InsertBefore,
			expressions: exps,
		})
	}

	/** Insert expressions to after specified position. */
	export function addAfter(index: number, exps: () => TS.Expression | TS.Expression[] | TS.Statement | TS.Statement[]) {
		interpolations.add(index, {
			position: InterpolationPosition.InsertAfter,
			expressions: exps,
		})
	}

	/** Add variables as declaration statements. */
	export function addVariables(index: number, names: string[]) {
		let node = VisitingTree.getNode(index)

		let stats = factory.createVariableStatement(
			undefined,
			factory.createVariableDeclarationList(
				names.map(name => 
					factory.createVariableDeclaration(
						factory.createIdentifier(name),
						undefined,
						undefined,
						undefined
					)
				),
				ts.NodeFlags.None
			)
		)
		
		if (helper.canBlock(node)) {
			let insertIndex = VisitingTree.getFirstChildIndex(index)
			Interpolator.addBefore(insertIndex, () => stats)
		}
		else if (ts.isCaseOrDefaultClause(node)) {
			let insertIndex = VisitingTree.getChildIndex(index, 1)
			Interpolator.addBefore(insertIndex, () => stats)
		}
		else if (ts.isVariableDeclarationList(node)) {
			let insertIndex = VisitingTree.getChildIndex(index, 1)
			Interpolator.addBefore(insertIndex, () => stats)
		}
	}

	/** 
	 * Reference a complex expression to become a reference variable,
	 * and capture replaced expression.
	 * e.g.: `a.b().c`-> `_ref = a.b(); ... _ref`.
	 */
	function referenceAndCapture(node: PropertyAccessingNode, index: number) {
		let refName = this.makeReference()
		let position = ContextTree.findClosestPositionToMoveStatements(index, this.context)

		// Can move statements.
		// Still have risk: `(a = b, a.c().d)`
		if (position) {

			// insert `_ref_ = a.b()` to found position.
			position.context.capturer.insertReferenceExpression(
				position.index, refName, node.expression
			)

			// `a.b().c` -> `_ref_.c`.
			let refAccessing = modifier.replaceReferencedAccessingExpression(
				node, factory.createIdentifier(refName)
			)

			// Replace original `a.b().c` to `_ref_.c`.
			interpolations.add(index, {
				position: InterpolationPosition.Replace,
				contentType: InterpolationContentType.Reference,
				expressions: [
					refAccessing
				],
			})

			// Capture `_ref_.c`.
			this.capture(refAccessing)
		}
		else {

			// `a.b().c`, replace it to `(_ref_ = a.b(), trackGet(_ref_, 'c'), _ref_).c`.
			interpolations.add(index, {
				position: InterpolationPosition.Replace,
				contentType: InterpolationContentType.Reference,
				replace: (n: TS.Node) => {
					let exp = modifier.parenthesizeExpressions(
						factory.createBinaryExpression(
							factory.createIdentifier(refName),
							factory.createToken(ts.SyntaxKind.EqualsToken),
							node.expression
						),
						factory.createCallExpression(
							factory.createIdentifier('trackGet'),
							undefined,
							[
								factory.createIdentifier(refName),
								helper.getPropertyAccessingName(n as PropertyAccessingNode)
							]
						),
						factory.createIdentifier(refName)
					)

					return modifier.replaceReferencedAccessingExpression(n as PropertyAccessingNode, exp)
				}
			})

			modifier.addNamedImport('trackGet', '@pucelle/ff')
		}
	}

	/** Insert a reference expression to specified index. */
	function insertReferenceExpression(index: number, refName: string, exp: TS.Expression) {
		interpolations.add(index, {
			position: InterpolationPosition.InsertBefore,
			contentType: InterpolationContentType.Reference,
			expressions: [
				factory.createBinaryExpression(
					factory.createIdentifier(refName),
					factory.createToken(ts.SyntaxKind.EqualsToken),
					exp
				)
			],
		})
	}

	/** 
	 * Add rest captured expressions before end position of context, or before a return statement.
	 * But:
	 *  - For like `return this.a`, will move `this.a` ahead.
	 *  - For like `return (ref_=a()).b`, will reference returned content and move it ahead.
	 */
	function insertRestCaptured() {
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
	function insertExpressionsNormally(node: TS.Node, index: number, exps: PropertyAccessingNode[]) {
		let type = this.context.type

		// `return ...`, `await ...`, `yield ...` or `() => ...`
		if (this.context.state.isBreakLikeOrImplicitReturning(node)) {
			let beFunctionBody = ts.isArrowFunction(node.parent) && !ts.isBlock(node)

			if (haveRef) {
				let refName = this.makeReference()

				interpolations.add(index, {
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
				interpolations.add(index, {
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
	
				interpolations.add(index, {
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
				interpolations.add(index, {
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
			interpolations.add(index, {
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

	/** 
	 * Output node at index.
	 * It overwrites all descendant nodes,
	 * and replace self and inserts all neighbor nodes.
	 */
	export function output(index: number): TS.Node | TS.Node[] {
		
		if (node === this.context.node && VisitingTree.getSiblingIndex(index) === 0) {

		}

		let items = interpolations.get(index)
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
				madeExps = exps ? ContextAccessingGrouper.makeGetExpressions(exps as PropertyAccessingNode[]) : []
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

	/** 
	 * Output node at index.
	 * It overwrites all descendant nodes,
	 * bot not replace self and inserts neighbor nodes.
	 */
	export function outputChildren(index: number): TS.Node {
		
		if (node === this.context.node && VisitingTree.getSiblingIndex(index) === 0) {

		}

		let items = interpolations.get(index)
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
				madeExps = exps ? ContextAccessingGrouper.makeGetExpressions(exps as PropertyAccessingNode[]) : []
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

	function outputReferenceVariables(node: TS.Node, index: number): TS.VariableStatement | null {
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