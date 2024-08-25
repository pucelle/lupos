import type TS from 'typescript'
import {ListMap} from '../utils'
import {factory, transformContext, ts} from './global'
import {Visiting} from './visiting'
import {Helper} from './helper'
import {definePreVisitCallback} from './visitor-callbacks'


export interface InterpolationItem {

	/** Where to interpolate. */
	position: InterpolationPosition

	/** Content type to sort. */
	contentType: InterpolationContentType

	/** 
	 * Must exist for `Before` or `After`, `Prepend`, `Append` positions.
	 * If is a list and becomes empty, no need to interpolate.
	 */
	exps?: () => TS.Node | TS.Node[]

	/** 
	 * Must exist for `Replace` position.
	 * Only one `replace` can exist.
	 */
	replace?: () => TS.Node | TS.Node[] | undefined
}

export enum InterpolationPosition {

	/** Insert before. */
	Before,

	/** Insert after. */
	After,

	/** 
	 * Prepend before the first of child list.
	 * Supports only a few types which have child list.
	 */
	Prepend,

	/** 
	 * Append after the last of child list.
	 * Supports only a few types which have child list.
	 */
	Append,

	/** Replace to some other nodes. */
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
export namespace Interpolator {

	/** Interpolated expressions, and where to interpolate. */
	const Interpolations: ListMap<number, InterpolationItem> = new ListMap()


	/** Initialize after enter a new source file */
	export function initialize() {
		Interpolations.clear()
	}


	/** Add an item. */
	export function add(toIndex: number, item: InterpolationItem) {
		
		// Not fully replace it.
		if (item.position === InterpolationPosition.Prepend) {
			let firstIndex = Visiting.getFirstChildIndex(toIndex)
			if (firstIndex) {
				toIndex = firstIndex
				item.position = InterpolationPosition.Before
			}
		}
		else if (item.position === InterpolationPosition.Append) {
			let lastIndex = Visiting.getLastChildIndex(toIndex)
			if (lastIndex) {
				toIndex = lastIndex
				item.position = InterpolationPosition.After
			}
		}
		else if (item.position === InterpolationPosition.Before || item.position === InterpolationPosition.After) {
			let parentIndex = Visiting.getParentIndex(toIndex)!
			let parentNode = Visiting.getNode(parentIndex)

			// Insert before or after expression statement.
			if (ts.isExpressionStatement(parentNode)) {
				toIndex = parentIndex
			}
		}

		Interpolations.add(toIndex, item)
	}


	/** Move node to another position. */
	export function move(fromIndex: number, toIndex: number) {
		add(toIndex, {
			position: InterpolationPosition.Before,
			contentType: InterpolationContentType.Normal,
			exps: () => outputChildren(fromIndex),
		})

		add(fromIndex, {
			position: InterpolationPosition.Replace,
			contentType: InterpolationContentType.Normal,
			replace: () => undefined,
		})
	}


	/** Remove node. */
	export function remove(index: number) {
		add(index, {
			position: InterpolationPosition.Replace,
			contentType: InterpolationContentType.Normal,
			replace: () => undefined,
		})
	}


	/** Insert expressions to before specified position. */
	export function before(index: number, contentType: InterpolationContentType, exps: () => TS.Node | TS.Node[]) {
		add(index, {
			position: InterpolationPosition.Before,
			contentType,
			exps,
		})
	}

	/** Insert expressions to after specified position. */
	export function after(index: number, contentType: InterpolationContentType, exps: () => TS.Node | TS.Node[]) {
		add(index, {
			position: InterpolationPosition.After,
			contentType,
			exps,
		})
	}

	/** Prepend expressions to the start inner position of target node. */
	export function prepend(index: number, contentType: InterpolationContentType, exps: () => TS.Node | TS.Node[]) {
		add(index, {
			position: InterpolationPosition.Prepend,
			contentType,
			exps,
		})
	}

	/** Append expressions to the end inner position of target node. */
	export function append(index: number, contentType: InterpolationContentType, exps: () => TS.Node | TS.Node[]) {
		add(index, {
			position: InterpolationPosition.Append,
			contentType,
			exps,
		})
	}

	/** Replace node to another node normally. */
	export function replace(
		index: number, contentType: InterpolationContentType, replace: () => TS.Node | TS.Node[] | undefined
	) {
		add(index, {
			position: InterpolationPosition.Replace,
			contentType,
			replace,
		})
	}


	/** 
	 * Output node at index.
	 * It overwrites all descendant nodes,
	 * bot not replace self or inserts neighbor nodes.
	 */
	export function outputChildren(index: number): TS.Node {
		let node = Visiting.getNode(index)
		let childIndices = Visiting.getChildIndices(index)

		if (!childIndices) {
			return node
		}

		let i = -1

		return ts.visitEachChild(node, () => {
			return output(childIndices![++i])
		}, transformContext)
	}

	/** 
	 * Output node at index.
	 * It overwrites all descendant nodes,
	 * and replace self and inserts all neighbor nodes.
	 */
	export function output(index: number): TS.Node | TS.Node[] | undefined {
		let items = Interpolations.get(index)
		if (!items) {
			return outputChildren(index)
		}

		// Sort by content type.
		items.sort((a, b) => a.contentType - b.contentType)

		let beforeNodes = items.filter(item => item.position === InterpolationPosition.Before)
			.map(item => item.exps!()).flat()

		let afterNodes = items.filter(item => item.position === InterpolationPosition.After)
			.map(item => item.exps!()).flat()

		let prependNodes = items.filter(item => item.position === InterpolationPosition.Prepend)
			.map(item => item.exps!()).flat()

		let appendNodes = items.filter(item => item.position === InterpolationPosition.Append)
			.map(item => item.exps!()).flat()

		let replace = items.filter(item => item.position === InterpolationPosition.Replace)
		if (replace.length > 1) {
			throw new Error(`Only one replace is allowed, happened at position "${Helper.getText(Visiting.getNode(index))}"!`)
		}

		let node: TS.Node | TS.Node[] | undefined
		let childNodes = [...prependNodes, ...appendNodes]

		if (replace.length > 0) {
			node = replace[0].replace!()

			if (prependNodes.length > 0 || appendNodes.length > 0) {
				console.warn(`Child nodes "${childNodes.map(n => Helper.getText(n)).join(', ')}" have been dropped!`)
			}
		}
		else {
			node = outputChildren(index)

			if (prependNodes.length > 0 || appendNodes.length > 0) {
				node = updateChildNodes(node, prependNodes, appendNodes)
			}
		}

		if (beforeNodes.length > 0 || afterNodes.length > 0) {
			node = replaceToAddNeighborNodes(index, node, beforeNodes, afterNodes)
		}

		return node && Array.isArray(node) && node.length === 1 ? node[0] : node
	}

	/** 
	 * Update child nodes.
	 * For only a few type of nodes.
	 */
	function updateChildNodes(node: TS.Node, prependNodes: TS.Node[], appendNodes: TS.Node[]): TS.Node {
		if (ts.isNamedImports(node)) {
			return factory.updateNamedImports(node, [
				...prependNodes as TS.ImportSpecifier[],
				...node.elements,
				...appendNodes as TS.ImportSpecifier[],
			])
		}
		else if (ts.isVariableDeclarationList(node)) {
			return factory.updateVariableDeclarationList(node, [
				...prependNodes as TS.VariableDeclaration[],
				...node.declarations,
				...appendNodes as TS.VariableDeclaration[],
			])
		}
		else if (ts.isClassDeclaration(node)) {
			return factory.updateClassDeclaration(
				node, 
				node.modifiers,
				node.name,
				node.typeParameters,
				node.heritageClauses,
				[
					...prependNodes as TS.ClassElement[],
					...node.members,
					...appendNodes as TS.ClassElement[],
				]
			)
		}
		else {
			throw new Error(`Don't know how to add child nodes for "${Helper.getText(node)}"!`)
		}
	}

	/** Try to replace node to make it can contain neighbor nodes. */
	function replaceToAddNeighborNodes(
		index: number, node: TS.Node | TS.Node[] | undefined,
		beforeNodes: TS.Node[], afterNodes: TS.Node[]
	): TS.Node | TS.Node[] {
		let rawNode = Visiting.getNode(index)
		let rawParent = rawNode.parent

		// Insert statements.
		if (Helper.pack.canPutStatements(rawParent)) {
			let list = arrangeNeighborNodes(node, beforeNodes, afterNodes)
			return list.map(n => Helper.pack.toStatement(n))
		}

		// Extend to block and insert statements.
		else if (Helper.pack.canExtendToPutStatements(rawNode)) {
			if (ts.isArrowFunction(rawParent)) {
				node = factory.createReturnStatement(node as TS.Expression)
			}
			let list = arrangeNeighborNodes(node, beforeNodes, afterNodes)

			return factory.createBlock(
				list.map(n => Helper.pack.toStatement(n))
			)
		}

		// Parenthesize it, move returned node to the end.
		else if (Helper.pack.shouldBeUnique(rawNode)) {
			let list = arrangeNeighborNodes(node, beforeNodes, afterNodes, true)
			return Helper.pack.parenthesizeExpressions(...list)
		}

		// Otherwise, return list directly.
		else {
			let list = arrangeNeighborNodes(node, beforeNodes, afterNodes)
			return list
		}
	}

	/** Re-arrange node list. */
	function arrangeNeighborNodes(
		node: TS.Node | TS.Node[] | undefined,
		beforeNodes: TS.Node[], afterNodes: TS.Node[],
		returnOriginal: boolean = false
	): TS.Expression[] {
		let list: TS.Expression[] = []

		if (returnOriginal) {
			list.push(...beforeNodes as TS.Expression[])
			list.push(...afterNodes as TS.Expression[])

			if (Array.isArray(node)) {
				list.push(...node as TS.Expression[])
			}
			else if (node) {
				list.push(node as TS.Expression)
			}
		}
		else {
			list.push(...beforeNodes as TS.Expression[])

			if (Array.isArray(node)) {
				list.push(...node as TS.Expression[])
			}
			else if (node) {
				list.push(node as TS.Expression)
			}

			list.push(...afterNodes as TS.Expression[])
		}

		// `(a) -> a`
		list = list.map(node => Helper.pack.normalize(node, false) as TS.Expression)

		return list
	}

	/** 
	 * Output an node, even the parameter node is an updated node,
	 * will still test it's all descendant nodes,
	 * and replace if it's a raw node.
	 */
	export function outputPartial(mayUpdatedNode: TS.Node): TS.Node {
		if (Visiting.hasNode(mayUpdatedNode)) {
			return outputChildren(Visiting.getIndex(mayUpdatedNode))
		}
		else {
			return ts.visitEachChild(mayUpdatedNode, outputPartial, transformContext)
		}
	}
}


definePreVisitCallback(Interpolator.initialize)