import type TS from 'typescript'
import {ListMap} from '../../utils'
import {factory, helper, transformContext, ts} from '../../base'
import {VisitingTree} from './visiting-tree'


export interface InterpolationItem {

	/** Where to interpolate. */
	position: InterpolationPosition

	/** Content type to sort. */
	contentType: InterpolationContentType

	/** 
	 * Must exist for `InsertBefore` or `InsertAfter` interpolation positions.
	 * If is a list and becomes empty, no need to interpolate.
	 */
	expressions?: () => TS.Node | TS.Node[]

	/** Must exist for `Replace` interpolation type. */
	replace?: () => TS.Node | undefined
}

export enum InterpolationPosition {
	InsertBefore,
	InsertAfter,
	Replace,
}

export enum InterpolationContentType {
	VariableDeclaration,
	Reference,
	Normal,
	GetTracking,
	SetTracking,
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

	/** The visiting indices the node at where will be moved. */
	const movedIndices: Set<number> = new Set()


	/** Initialize after enter a new source file */
	export function initialize() {
		interpolations.clear()
		movedIndices.clear()
	}


	/** Move node to another position, only move for once. */
	export function moveOnce(fromIndex: number, toIndex: number) {
		if (movedIndices.has(fromIndex)) {
			return
		}

		interpolations.add(toIndex, {
			position: InterpolationPosition.InsertBefore,
			contentType: InterpolationContentType.Normal,
			expressions: () => {
				return helper.toStatement(outputChildren(fromIndex) as TS.Node)
			},
		})

		interpolations.add(fromIndex, {
			position: InterpolationPosition.Replace,
			contentType: InterpolationContentType.Normal,
			replace: () => {
				return undefined
			},
		})

		movedIndices.add(fromIndex)
	}


	/** 
	 * Insert a variable assignment to specified index.
	 * `a.b()` -> `var _ref_ = a.b()`, and move it.
	 */
	export function addVariableAssignment(fromIndex: number, toIndex: number, varName: string) {
		interpolations.add(toIndex, {
			position: InterpolationPosition.InsertBefore,
			contentType: InterpolationContentType.Reference,
			expressions: () => {
				let node = outputChildren(fromIndex) as TS.Expression

				// `(a) -> a`
				node = helper.mayEliminateUniqueParenthesize(node) as TS.Expression

				return factory.createVariableDeclaration(
					factory.createIdentifier(varName),
					undefined,
					undefined,
					node
				)
			},
		})
	}

	/** 
	 * Insert a reference expression to specified index.
	 * `a.b()` -> `_ref_ = a.b()`, and move it.
	 */
	export function addReferenceAssignment(fromIndex: number, toIndex: number, refName: string) {
		interpolations.add(toIndex, {
			position: InterpolationPosition.InsertBefore,
			contentType: InterpolationContentType.Reference,
			expressions: () => {
				let node = outputChildren(fromIndex) as TS.Expression

				// `(a) -> a`
				node = helper.mayEliminateUniqueParenthesize(node) as TS.Expression

				return factory.createBinaryExpression(
					factory.createIdentifier(refName),
					factory.createToken(ts.SyntaxKind.EqualsToken),
					node
				)
			},
		})
	}

	/** Replace node at specified index to another. */
	export function addReferenceReplace(index: number, replace: () => TS.Node) {
		interpolations.add(index, {
			position: InterpolationPosition.Replace,
			contentType: InterpolationContentType.Reference,
			replace,
		})
	}

	/** Insert expressions to before specified position. */
	export function addBefore(index: number, exps: () => TS.Node | TS.Node[]) {
		interpolations.add(index, {
			position: InterpolationPosition.InsertBefore,
			contentType: InterpolationContentType.GetTracking,
			expressions: exps,
		})
	}

	/** Insert expressions to before specified position. */
	export function addVariableDeclarationBefore(index: number, exps: () => TS.Node | TS.Node[]) {
		interpolations.add(index, {
			position: InterpolationPosition.InsertBefore,
			contentType: InterpolationContentType.VariableDeclaration,
			expressions: exps,
		})
	}

	/** Insert expressions to after specified position. */
	export function addAfter(index: number, exps: () => TS.Node | TS.Node[]) {
		interpolations.add(index, {
			position: InterpolationPosition.InsertAfter,
			contentType: InterpolationContentType.GetTracking,
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

			Interpolator.addVariableDeclarationBefore(insertIndex, () => stats)
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
	
			Interpolator.addVariableDeclarationBefore(insertIndex, () => decls)
		}
	}


	/** 
	 * Output node at index.
	 * It overwrites all descendant nodes,
	 * and replace self and inserts all neighbor nodes.
	 */
	export function output(index: number): TS.Node | TS.Node[] | undefined {
		let items = interpolations.get(index)
		if (!items) {
			return outputChildren(index)
		}

		// Sort by content type.
		items.sort((a, b) => a.contentType - b.contentType)

		let beforeNodes = items.filter(item => item.position === InterpolationPosition.InsertBefore)
			.map(item => item.expressions!()).flat()

		let afterNodes = items.filter(item => item.position === InterpolationPosition.InsertAfter)
			.map(item => item.expressions!()).flat()

		let replace = items.filter(item => item.position === InterpolationPosition.Replace)
		if (replace.length > 1) {
			throw new Error(`Only one replace is allowed for position "${helper.getText(VisitingTree.getNode(index))}"!`)
		}

		let node: TS.Node | TS.Node[] | undefined

		if (replace.length > 0) {
			node = replace[0].replace!()
		}
		else {
			node = outputChildren(index)
		}

		if (beforeNodes.length > 0 || afterNodes.length > 0) {
			node = replaceToAddNeighborNodes(index, node, beforeNodes, afterNodes)
		}

		return node && Array.isArray(node) && node.length === 1 ? node[0] : node
	}

	/** Try to replace node to make it can contain neighbor nodes. */
	function replaceToAddNeighborNodes(index: number, node: TS.Node | undefined, beforeNodes: TS.Node[], afterNodes: TS.Node[]): TS.Node | TS.Node[] {
		let rawNode = VisitingTree.getNode(index)
		let rawParent = VisitingTree.getNode(VisitingTree.getParentIndex(index)!)
		let isFlowInterrupt = helper.isFlowInterruptWithContent(rawNode)

		// Add more variable declaration.
		if (ts.isVariableDeclaration(rawNode)) {
			return arrangeNeighborNodes(node, beforeNodes, afterNodes, false)
		}

		// Insert statements.
		else if (helper.canPutStatements(rawParent)) {
			let list = arrangeNeighborNodes(node, beforeNodes, afterNodes, isFlowInterrupt)
			return list.map(n => helper.toStatement(n))
		}

		// Extend to block and insert statements.
		else if (helper.canExtendToPutStatements(rawNode)) {
			if (ts.isArrowFunction(rawParent)) {
				node = factory.createReturnStatement(node as TS.Expression)
			}
			let list = arrangeNeighborNodes(node, beforeNodes, afterNodes, isFlowInterrupt)

			return factory.createBlock(
				list.map(n => helper.toStatement(n))
			)
		}

		// Parenthesize it, move after nodes forward.
		// Normally will move inserting contents ahead at optimizing step.
		else if (isFlowInterrupt) {
			let exp = helper.getMayFlowInterruptContent(node as TS.Expression)
			let list = arrangeNeighborNodes(exp, beforeNodes, afterNodes, isFlowInterrupt)
			let parenthesized = helper.parenthesizeExpressions(...list)

			return helper.restoreFlowInterruptByContent(parenthesized, node as TS.ReturnStatement | TS.Expression)
		}

		// Must return original expression.
		else if (helper.shouldBeExpression(rawNode)) {
			let list = arrangeNeighborNodes(node, beforeNodes, afterNodes, true)
			return helper.parenthesizeExpressions(...list)
		}

		// Otherwise, Parenthesize and no need to return original.
		else {
			let list = arrangeNeighborNodes(node, beforeNodes, afterNodes, false)
			return helper.parenthesizeExpressions(...list)
		}
	}

	/** Re-arrange node list. */
	function arrangeNeighborNodes(node: TS.Node | undefined, beforeNodes: TS.Node[], afterNodes: TS.Node[], returnOriginal: boolean): TS.Expression[] {
		let list: TS.Expression[] = []

		if (returnOriginal) {
			list.push(...beforeNodes as TS.Expression[])
			list.push(...afterNodes as TS.Expression[])

			if (node) {
				list.push(node as TS.Expression)
			}
		}
		else {
			list.push(...beforeNodes as TS.Expression[])

			if (node) {
				list.push(node as TS.Expression)
			}

			list.push(...afterNodes as TS.Expression[])
		}

		return list
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

		let i = -1

		return ts.visitEachChild(node, () => {
			return output(childIndices[++i])
		}, transformContext)
	}
}