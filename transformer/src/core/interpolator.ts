import * as ts from 'typescript'
import {ListMap} from '../utils'
import {factory, transformContext} from './global'
import {VisitTree} from './visit-tree'
import {Helper} from '../lupos-ts-module'
import {definePreVisitCallback} from './visitor-callbacks'
import {Packer} from './packer'


export interface InterpolationItem {

	/** Where to interpolate. */
	position: InterpolationPosition

	/** Content type to sort. */
	contentType: InterpolationContentType

	/** 
	 * Must exist for `Before` or `After`, `Prepend`, `Append` positions.
	 * If is a list and becomes empty, no need to interpolate.
	 */
	exps?: () => ts.Node | ts.Node[]

	/** 
	 * Must exist for `Replace` position.
	 * Only one `replace` can exist.
	 */
	replace?: () => ts.Node | ts.Node[] | undefined

	/** Sort interpolated expressions. */
	order?: number
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
	Import,
	Declaration,
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
			let siblings = getPendingSiblings(toIndex)
			if (siblings && siblings.length > 0) {
				toIndex = VisitTree.getIndex(siblings[0])
				item.position = InterpolationPosition.Before
			}
		}
		else if (item.position === InterpolationPosition.Append) {
			let siblings = getPendingSiblings(toIndex)
			if (siblings && siblings.length > 0) {
				toIndex = VisitTree.getIndex(siblings[siblings.length - 1])
				item.position = InterpolationPosition.After
			}
		}
		else if (item.position === InterpolationPosition.Before || item.position === InterpolationPosition.After) {
			let parentIndex = VisitTree.getParentIndex(toIndex)!
			let parentNode = VisitTree.getNode(parentIndex)

			// Insert before or after expression statement.
			if (ts.isExpressionStatement(parentNode)) {
				toIndex = parentIndex
			}
		}

		Interpolations.add(toIndex, item)
	}

	/** Get sibling nodes array for prepending and appending. */
	function getPendingSiblings(index: number): ts.NodeArray<ts.Node> | ts.Node[] | undefined {
		let node = VisitTree.getNode(index)!

		if (ts.isNamedImports(node)) {
			return node.elements
		}
		else if (ts.isVariableDeclarationList(node)) {
			return node.declarations
		}
		else if (ts.isClassDeclaration(node)) {
			return node.members
		}

		// There are still some other types, like enum, interface.
		else {
			return VisitTree.getChildNodes(index)
		}
	}

	
	/** 
	 * Update child nodes when no siblings can be located.
	 * For only a few type of nodes.
	 */
	function updatePending(node: ts.Node, prependNodes: ts.Node[], appendNodes: ts.Node[]): ts.Node {
		if (ts.isNamedImports(node)) {
			return factory.updateNamedImports(node, [
				...prependNodes as ts.ImportSpecifier[],
				...node.elements,
				...appendNodes as ts.ImportSpecifier[],
			])
		}
		else if (ts.isVariableDeclarationList(node)) {
			return factory.updateVariableDeclarationList(node, [
				...prependNodes as ts.VariableDeclaration[],
				...node.declarations,
				...appendNodes as ts.VariableDeclaration[],
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
					...prependNodes as ts.ClassElement[],
					...node.members,
					...appendNodes as ts.ClassElement[],
				]
			)
		}
		else if (ts.isBlock(node)) {
			return factory.updateBlock(
				node, 
				[
					...Packer.toStatements(prependNodes),
					...node.statements,
					...Packer.toStatements(appendNodes),
				]
			)
		}
		else {
			throw new Error(`Don't know how to add child nodes for "${Helper.getFullText(node)}"!`)
		}
	}



	/** Move node to another position. */
	export function move(fromIndex: number, toIndex: number) {
		add(toIndex, {
			position: InterpolationPosition.Before,
			contentType: InterpolationContentType.Normal,
			exps: () => outputChildren(fromIndex),
			order: undefined,
		})

		add(fromIndex, {
			position: InterpolationPosition.Replace,
			contentType: InterpolationContentType.Normal,
			replace: () => undefined,
			order: undefined,
		})
	}


	/** Remove node. */
	export function remove(index: number) {
		add(index, {
			position: InterpolationPosition.Replace,
			contentType: InterpolationContentType.Normal,
			replace: () => undefined,
			order: undefined,
		})
	}


	/** Insert expressions to before specified visit index. */
	export function before(index: number, contentType: InterpolationContentType, exps: () => ts.Node | ts.Node[], order?: number) {
		add(index, {
			position: InterpolationPosition.Before,
			contentType,
			exps,
			order,
		})
	}

	/** Insert expressions to after specified visit index. */
	export function after(index: number, contentType: InterpolationContentType, exps: () => ts.Node | ts.Node[], order?: number) {
		add(index, {
			position: InterpolationPosition.After,
			contentType,
			exps,
			order,
		})
	}

	/** Prepend expressions to the start inner position of target visit index. */
	export function prepend(index: number, contentType: InterpolationContentType, exps: () => ts.Node | ts.Node[], order?: number) {
		add(index, {
			position: InterpolationPosition.Prepend,
			contentType,
			exps,
			order,
		})
	}

	/** Append expressions to the end inner position of target visit index. */
	export function append(index: number, contentType: InterpolationContentType, exps: () => ts.Node | ts.Node[], order?: number) {
		add(index, {
			position: InterpolationPosition.Append,
			contentType,
			exps,
			order,
		})
	}

	/** Replace node at specified visit index to another node normally. */
	export function replace(
		index: number, contentType: InterpolationContentType, replace: () => ts.Node | ts.Node[] | undefined
	) {
		add(index, {
			position: InterpolationPosition.Replace,
			contentType,
			replace,
			order: undefined,
		})
	}


	/** 
	 * Output node at index.
	 * It overwrites all descendant nodes,
	 * bot not replace self or inserts neighbor nodes.
	 */
	export function outputChildren(index: number): ts.Node {
		let node = VisitTree.getNode(index)
		let childIndices = VisitTree.getChildIndices(index)

		if (!childIndices) {
			return node
		}

		let i = -1

		return ts.visitEachChild(node, () => {
			return outputSelf(childIndices![++i])
		}, transformContext)
	}

	/** 
	 * Output node at index.
	 * It may overwrite all descendant nodes,
	 * and may replace itself.
	 * If `addNeighbors` is `true`, will output all neighbor nodes.
	 */
	export function outputSelf(index: number, addNeighbors: boolean = true): ts.Node | ts.Node[] | undefined {
		let items = Interpolations.get(index)
		if (!items) {
			return outputChildren(index)
		}

		// Sort by order.
		items.sort((a, b) => {
			if (a.order === undefined || b.order === undefined) {
				return 0
			}

			return a.order - b.order
		})

		// Sort by content type.
		items.sort((a, b) => a.contentType - b.contentType)

		let prependNodes = items.filter(item => item.position === InterpolationPosition.Prepend)
			.map(item => item.exps!()).flat()

		let appendNodes = items.filter(item => item.position === InterpolationPosition.Append)
			.map(item => item.exps!()).flat()

		let replace = items.filter(item => item.position === InterpolationPosition.Replace)
		if (replace.length > 1) {
			throw new Error(`Only one replace is allowed, happened at position "${Helper.getFullText(VisitTree.getNode(index))}"!`)
		}

		let node: ts.Node | ts.Node[] | undefined

		if (replace.length > 0) {
			node = replace[0].replace!()

			if (prependNodes.length > 0 || appendNodes.length > 0) {
				let childNodes = [...prependNodes, ...appendNodes]
				console.warn(`Child nodes "${childNodes.map(n => Helper.getFullText(n)).join(', ')}" have been dropped!`)
			}
		}
		else {
			node = outputChildren(index)

			if (prependNodes.length > 0 || appendNodes.length > 0) {
				node = updatePending(node, prependNodes, appendNodes)
			}
		}

		if (addNeighbors) {
			let beforeNodes = items.filter(item => item.position === InterpolationPosition.Before)
				.map(item => item.exps!()).flat()

			let afterNodes = items.filter(item => item.position === InterpolationPosition.After)
				.map(item => item.exps!()).flat()

			if (beforeNodes.length > 0 || afterNodes.length > 0) {
				node = replaceToAddNeighborNodes(index, node, beforeNodes, afterNodes)
			}
		}

		// console.log('-------------------------------------')
		// console.log('FROM', Helper.getText(VisitTree.getNode(index)))
		// console.log('TO', Array.isArray(node) ? node.map(n => Helper.getText(n)) : node ? Helper.getText((node)) : 'NONE')

		return node && Array.isArray(node) && node.length === 1 ? node[0] : node
	}


	/** 
	 * Output raw node.
	 * It may overwrite all descendant nodes,
	 * and may replace itself.
	 * will not output all neighbor nodes.
	 */
	export function outputNodeSelf(rawNode: ts.Node): ts.Node {
		let index = VisitTree.getIndex(rawNode)
		let node = Interpolator.outputSelf(index, false)

		if (!node) {
			throw new Error(`"${Helper.getFullText(rawNode)}" has been removed!`)
		}

		if (Array.isArray(node)) {
			throw new Error(`"${Helper.getFullText(rawNode)}" has been replaced to several!`)
		}

		return node
	}

	/** Try to replace node to make it can contain neighbor nodes. */
	function replaceToAddNeighborNodes(
		index: number, node: ts.Node | ts.Node[] | undefined,
		beforeNodes: ts.Node[], afterNodes: ts.Node[]
	): ts.Node | ts.Node[] {
		let rawNode = VisitTree.getNode(index)
		let rawParent = rawNode.parent

		// Insert statements.
		if (Packer.canPutStatements(rawParent)) {
			let list = arrangeNeighborNodes(node, beforeNodes, afterNodes)
			return Packer.toStatements(list)
		}

		// Extend to block and insert statements.
		else if (Packer.canExtendToPutStatements(rawNode)) {
			if (ts.isArrowFunction(rawParent)) {
				node = factory.createReturnStatement(node as ts.Expression)
			}
			let list = arrangeNeighborNodes(node, beforeNodes, afterNodes)

			return factory.createBlock(
				Packer.toStatements(list),
				true
			)
		}

		// Parent is a parenthesize expression already, should join with comma token.
		else if (ts.isParenthesizedExpression(rawParent)) {
			let list = arrangeNeighborNodes(node, beforeNodes, afterNodes, true)
			return Packer.bundleBinaryExpressions(list, ts.SyntaxKind.CommaToken)
		}

		// Parenthesize it, and move returned node to the end part.
		else if (Packer.shouldBeUnique(rawNode)) {
			let list = arrangeNeighborNodes(node, beforeNodes, afterNodes, true)
			return Packer.parenthesizeExpressions(...list)
		}

		// Otherwise, return list directly.
		else {
			let list = arrangeNeighborNodes(node, beforeNodes, afterNodes)
			return list
		}
	}

	/** Re-arrange node list. */
	function arrangeNeighborNodes(
		node: ts.Node | ts.Node[] | undefined,
		beforeNodes: ts.Node[], afterNodes: ts.Node[],
		returnOriginal: boolean = false
	): ts.Expression[] {
		let list: ts.Expression[] = []

		if (returnOriginal) {
			list.push(...beforeNodes as ts.Expression[])
			list.push(...afterNodes as ts.Expression[])

			if (Array.isArray(node)) {
				list.push(...node as ts.Expression[])
			}
			else if (node) {
				list.push(node as ts.Expression)
			}
		}
		else {
			list.push(...beforeNodes as ts.Expression[])

			if (Array.isArray(node)) {
				list.push(...node as ts.Expression[])
			}
			else if (node) {
				list.push(node as ts.Expression)
			}

			list.push(...afterNodes as ts.Expression[])
		}

		// `(a) -> a`
		list = list.map(node => Packer.normalize(node, false) as ts.Expression)

		return list
	}
}


definePreVisitCallback(Interpolator.initialize)