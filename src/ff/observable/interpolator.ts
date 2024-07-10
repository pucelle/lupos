import type TS from 'typescript'
import {ListMap} from '../../utils'
import {factory, helper, modifier, transformContext, ts} from '../../base'
import {VisitingTree} from './visiting-tree'


export interface InterpolationItem {

	/** Where to interpolate. */
	position: InterpolationPosition

	/** 
	 * Must exist for `InsertBefore` or `InsertAfter` interpolation positions.
	 * If is a list and becomes empty, no need to interpolate.
	 */
	expressions?: () => TS.Node | TS.Node[]

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
	export function addBefore(index: number, exps: () => TS.Node | TS.Node[]) {
		interpolations.add(index, {
			position: InterpolationPosition.InsertBefore,
			expressions: exps,
		})
	}

	/** Insert expressions to after specified position. */
	export function addAfter(index: number, exps: () => TS.Node | TS.Node[]) {
		interpolations.add(index, {
			position: InterpolationPosition.InsertAfter,
			expressions: exps,
		})
	}

	/** Add variables as declaration statements. */
	export function addVariables(index: number, names: string[]) {
		let node = VisitingTree.getNode(index)
		
		if (helper.canBlock(node) || ts.isCaseOrDefaultClause(node)) {
			let insertIndex
			
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
				insertIndex = VisitingTree.getFirstChildIndex(index)
			}
			else {
				insertIndex = VisitingTree.getChildIndex(index, 1)
			}

			Interpolator.addBefore(insertIndex, () => stats)
		}

		// `for (let i = 0; ...) ...`
		else if (ts.isVariableStatement(node)) {

			// First of list
			let insertIndex = VisitingTree.getFirstChildIndex(VisitingTree.getFirstChildIndex(index))

			let decls = names.map(name => 
				factory.createVariableDeclaration(
					factory.createIdentifier(name),
					undefined,
					undefined,
					undefined
				)
			)
	
			Interpolator.addBefore(insertIndex, () => decls)
		}
	}

	
	/** 
	 * Output node at index.
	 * It overwrites all descendant nodes,
	 * and replace self and inserts all neighbor nodes.
	 */
	export function output(index: number): TS.Node | TS.Node[] {
		let items = interpolations.get(index)
		if (!items) {
			return outputChildren(index)
		}

		let beforeNodes = items.filter(item => item.position === InterpolationPosition.InsertBefore)
			.map(item => item.expressions!()).flat()

		let afterNodes = items.filter(item => item.position === InterpolationPosition.InsertAfter)
			.map(item => item.expressions!()).flat()

		let replace = items.find(item => item.position === InterpolationPosition.Replace)?.replace
		let node: TS.Node | TS.Node[]

		if (replace) {
			node = replace()
		}
		else {
			node = outputChildren(index)
		}

		if (beforeNodes.length > 0 || afterNodes.length > 0) {
			node = replaceToAddNeighborNodes(index, node, beforeNodes, afterNodes)
		}

		return Array.isArray(node) && node.length === 1 ? node[0] : node
	}

	/** Try to replace node to make it can contain neighbor nodes. */
	function replaceToAddNeighborNodes(index: number, node: TS.Node, beforeNodes: TS.Node[], afterNodes: TS.Node[]): TS.Node | TS.Node[] {
		let parent = VisitingTree.getNode(VisitingTree.getParentIndex(index))

		// Leave it
		if (ts.isVariableDeclarationList(parent)) {
			return [...beforeNodes, node, ...afterNodes]
		}

		// Parenthesize it, move after nodes forward.
		// Normally will move inserting contents ahead at optimizing step.
		else if (helper.isFlowInterruptWithContent(node) && afterNodes.length > 0) {
			return modifier.parenthesizeExpressions(
				...[...beforeNodes,
					...afterNodes,
					node,
				] as TS.Expression[]
			)
		}

		// Insert statements
		else if (helper.canPutStatements(parent)) {
			return [...beforeNodes, node, ...afterNodes].map(n => modifier.toStatement(n as TS.Expression))
		}

		// Extend to block and insert statements
		else if (helper.canExtendToPutStatements(node)) {
			return factory.createBlock(
				[...beforeNodes, node, ...afterNodes].map(n => modifier.toStatement(n as TS.Expression))
			)
		}

		// Otherwise, Parenthesize to a expression.
		else {
			return modifier.parenthesizeExpressions(
				...[...beforeNodes,
					node,
					...afterNodes,
				] as TS.Expression[]
			)
		}
	}

	/** 
	 * Output node at index.
	 * It overwrites all descendant nodes,
	 * bot not replace self or inserts neighbor nodes.
	 */
	export function outputChildren(index: number): TS.Node {
		let node = VisitingTree.getNode(index)
		let childIndices = VisitingTree.getChildIndices(index)

		if (!childIndices) {
			return node
		}

		let i = 0

		return ts.visitEachChild(node, () => {
			return output(childIndices[i++])
		}, transformContext)
	}
}