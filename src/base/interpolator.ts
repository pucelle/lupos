import type TS from 'typescript'
import {ListMap} from '../utils'
import {factory, transformContext, ts} from './global'
import {visiting} from './visiting'
import {helper} from './helper'
import {VisitingTree} from '../ff/observable/visiting-tree'


export interface InterpolationItem {

	/** Where to interpolate. */
	position: InterpolationPosition

	/** Content type to sort. */
	contentType: InterpolationContentType

	/** 
	 * Must exist for `InsertBefore` or `InsertAfter` positions.
	 * If is a list and becomes empty, no need to interpolate.
	 */
	expressions?: () => TS.Node | TS.Node[]

	/** Must exist for `Replace` position. */
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
	Tracking,
}


/** 
 * It attaches to each context.
 * Remember where to interpolate expressions, and interpolate there some contents.
 */
export namespace interpolator {

	/** Interpolated expressions, and where to interpolate. */
	const interpolations: ListMap<number, InterpolationItem> = new ListMap()

	/** Initialize after enter a new source file */
	export function initialize() {
		interpolations.clear()
	}


	/** Move node to another position. */
	export function move(fromIndex: number, toIndex: number) {
		interpolations.add(toIndex, {
			position: InterpolationPosition.InsertBefore,
			contentType: InterpolationContentType.Normal,
			expressions: () => outputChildren(fromIndex),
		})

		interpolations.add(fromIndex, {
			position: InterpolationPosition.Replace,
			contentType: InterpolationContentType.Normal,
			replace: () => undefined,
		})
	}


	/** 
	 * Insert a variable assignment from a position to another position.
	 * `a.b()` -> `var _ref_ = a.b()`, and move it.
	 */
	export function addVariableAssignment(fromIndex: number, toIndex: number, varName: string) {
		interpolations.add(toIndex, {
			position: InterpolationPosition.InsertBefore,
			contentType: InterpolationContentType.VariableDeclaration,
			expressions: () => {
				let node = outputChildren(fromIndex) as TS.Expression

				// `(a) -> a`
				node = helper.pack.simplifyShallow(node) as TS.Expression

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
	 * Insert a reference expression from a position to another position.
	 * `a.b()` -> `_ref_ = a.b()`, and move it.
	 */
	export function addReferenceAssignment(fromIndex: number, toIndex: number, refName: string) {
		interpolations.add(toIndex, {
			position: InterpolationPosition.InsertBefore,
			contentType: InterpolationContentType.Reference,
			expressions: () => {
				let node = outputChildren(fromIndex) as TS.Expression

				// `(a) -> a`
				node = helper.pack.simplifyShallow(node) as TS.Expression

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
			contentType: InterpolationContentType.Tracking,
			expressions: exps,
		})
	}

	/** Insert expressions to after specified position. */
	export function addAfter(index: number, exps: () => TS.Node | TS.Node[]) {
		interpolations.add(index, {
			position: InterpolationPosition.InsertAfter,
			contentType: InterpolationContentType.Tracking,
			expressions: exps,
		})
	}

	/** Replace node to another node normally. */
	export function addReplace(index: number, replace: () => TS.Node) {
		interpolations.add(index, {
			position: InterpolationPosition.Replace,
			contentType: InterpolationContentType.Normal,
			replace,
		})
	}

	/** Add variables as declaration statements. */
	export function addVariables(index: number, names: string[]) {
		let rawNode = visiting.getNode(index)
		let exps: TS.VariableDeclarationList | TS.VariableDeclaration[]
		let toIndex: number
		
		if (helper.pack.canPutStatements(rawNode)) {
			exps = factory.createVariableDeclarationList(
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

			// Insert the first of block.
			if (helper.pack.canBlock(rawNode)) {
				toIndex = visiting.getFirstChildIndex(index)!
			}

			// Insert the statements of `case` of `default`.
			else {
				toIndex = visiting.getChildIndex(index, 1)
			}
		}

		// `for (let i = 0; ...) ...`
		else if (ts.isVariableStatement(rawNode)) {

			// First of variable list.
			toIndex = visiting.getFirstChildIndex(visiting.getFirstChildIndex(index)!)!

			exps = names.map(name => 
				factory.createVariableDeclaration(
					factory.createIdentifier(name),
					undefined,
					undefined,
					undefined
				)
			)
		}

		else {
			throw new Error(`Cant add variables to "${helper.getText(VisitingTree.getNode(index))}"!`)
		}

		interpolations.add(toIndex, {
			position: InterpolationPosition.InsertBefore,
			contentType: InterpolationContentType.VariableDeclaration,
			expressions: () => exps,
		})
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
			throw new Error(`Only one replace is allowed for position "${helper.getText(visiting.getNode(index))}"!`)
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
		let rawNode = visiting.getNode(index)
		let rawParent = visiting.getNode(visiting.getParentIndex(index)!)
		let isFlowInterrupted = helper.pack.isFlowInterruption(rawNode)

		// Add more variable declaration.
		if (ts.isVariableDeclaration(rawNode)) {
			return arrangeNeighborNodes(node, beforeNodes, afterNodes, false)
		}

		// Insert statements.
		else if (helper.pack.canPutStatements(rawParent)) {
			let list = arrangeNeighborNodes(node, beforeNodes, afterNodes, isFlowInterrupted)
			return list.map(n => helper.pack.toStatement(n))
		}

		// Extend to block and insert statements.
		else if (helper.pack.canExtendToPutStatements(rawNode)) {
			if (ts.isArrowFunction(rawParent)) {
				node = factory.createReturnStatement(node as TS.Expression)
			}
			let list = arrangeNeighborNodes(node, beforeNodes, afterNodes, isFlowInterrupted)

			return factory.createBlock(
				list.map(n => helper.pack.toStatement(n))
			)
		}

		// Unpack return statement, parenthesize it, move returned node to the end, and re-pack.
		else if (isFlowInterrupted) {
			let exp = helper.pack.getMayFlowInterruptionContent(node as TS.Expression)
			let list = arrangeNeighborNodes(exp, beforeNodes, afterNodes, isFlowInterrupted)
			let parenthesized = helper.pack.parenthesizeExpressions(...list)

			return helper.pack.restoreFlowInterruption(parenthesized, node as TS.ReturnStatement | TS.Expression)
		}

		// Parenthesize it, move returned node to the end.
		else if (helper.pack.shouldBeExpression(rawNode)) {
			let list = arrangeNeighborNodes(node, beforeNodes, afterNodes, true)
			return helper.pack.parenthesizeExpressions(...list)
		}

		// Otherwise, Parenthesize and no need to return original.
		else {
			let list = arrangeNeighborNodes(node, beforeNodes, afterNodes, false)
			return helper.pack.parenthesizeExpressions(...list)
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
		let node = visiting.getNode(index)
		let childIndices = visiting.getChildIndices(index)

		if (!childIndices) {
			return node
		}

		let i = -1

		return ts.visitEachChild(node, () => {
			return output(childIndices[++i])
		}, transformContext)
	}
}