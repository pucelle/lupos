import * as ts from 'typescript'
import {ListMap} from '../lupos-ts-module'
import {factory, transformContext, helper} from './global'
import {VisitTree} from './visit-tree'
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
	replace?: () => ts.Node | ts.Node[]

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

	/** Replace to some other nodes. */
	Remove,
}

export enum InterpolationContentType {
	Import,
	Declaration,
	Reference,
	Normal,
	Tracking,
}

/** Output options, default values of all items are `true`. */
export interface OutputOptions {
	canReplace?: boolean
	canRemove?: boolean
	canInsert?: boolean
}


/** 
 * It attaches to each context.
 * Remember where to interpolate expressions,
 * and interpolate there some contents.
 */
export namespace Interpolator {

	/** Interpolated expressions, and where to interpolate. */
	const Interpolations: ListMap<ts.Node, InterpolationItem> = new ListMap()


	/** Initialize after enter a new source file */
	export function initialize() {
		Interpolations.clear()
	}


	/** Add an interpolation item. */
	export function add(toNode: ts.Node, item: InterpolationItem) {
		
		// Not fully replace it.
		if (item.position === InterpolationPosition.Prepend) {
			let siblings = getPendingSiblings(toNode)
			if (siblings && siblings.length > 0) {
				toNode = siblings[0]
				item.position = InterpolationPosition.Before
			}
		}
		else if (item.position === InterpolationPosition.Append) {
			let siblings = getPendingSiblings(toNode)
			if (siblings && siblings.length > 0) {
				toNode = siblings[siblings.length - 1]
				item.position = InterpolationPosition.After
			}
		}
		else if (item.position === InterpolationPosition.Before || item.position === InterpolationPosition.After) {
			let parentNode = toNode.parent!

			// Insert before or after expression statement.
			if (ts.isExpressionStatement(parentNode)) {
				toNode = parentNode
			}
		}

		Interpolations.add(toNode, item)
	}

	/** Get sibling nodes array for prepending and appending. */
	function getPendingSiblings(node: ts.Node): ts.NodeArray<ts.Node> | ts.Node[] | undefined {
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
			return VisitTree.getChildNodes(node)
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
			throw new Error(`Don't know how to add child nodes for "${helper.getFullText(node)}"!`)
		}
	}



	/** Move node to before another position. */
	export function move(fromNode: ts.Node, toNode: ts.Node) {
		add(toNode, {
			position: InterpolationPosition.Before,
			contentType: InterpolationContentType.Normal,
			exps: () => outputChildren(fromNode),
			order: undefined,
		})

		add(fromNode, {
			position: InterpolationPosition.Remove,
			contentType: InterpolationContentType.Normal,
			order: undefined,
		})
	}


	/** Remove node. */
	export function remove(fromNode: ts.Node) {
		add(fromNode, {
			position: InterpolationPosition.Remove,
			contentType: InterpolationContentType.Normal,
			order: undefined,
		})
	}


	/** Insert expressions to before specified node. */
	export function before(
		toNode: ts.Node,
		contentType: InterpolationContentType,
		exps: () => ts.Node | ts.Node[],
		order?: number
	) {
		add(toNode, {
			position: InterpolationPosition.Before,
			contentType,
			exps,
			order,
		})
	}

	/** Insert expressions to after specified node. */
	export function after(
		toNode: ts.Node,
		contentType: InterpolationContentType,
		exps: () => ts.Node | ts.Node[],
		order?: number
	) {
		add(toNode, {
			position: InterpolationPosition.After,
			contentType,
			exps,
			order,
		})
	}

	/** Prepend expressions to the start inner position of target node. */
	export function prepend(
		toNode: ts.Node,
		contentType: InterpolationContentType,
		exps: () => ts.Node | ts.Node[],
		order?: number
	) {
		add(toNode, {
			position: InterpolationPosition.Prepend,
			contentType,
			exps,
			order,
		})
	}

	/** Append expressions to the end inner position of target node. */
	export function append(
		toNode: ts.Node,
		contentType: InterpolationContentType,
		exps: () => ts.Node | ts.Node[],
		order?: number
	) {
		add(toNode, {
			position: InterpolationPosition.Append,
			contentType,
			exps,
			order,
		})
	}

	/** Replace node at specified node to another node normally. */
	export function replace(
		toNode: ts.Node,
		contentType: InterpolationContentType,
		replace: () => ts.Node | ts.Node[]
	) {
		add(toNode, {
			position: InterpolationPosition.Replace,
			contentType,
			replace,
			order: undefined,
		})
	}


	/** 
	 * Output node by specified raw node.
	 * It overwrites all descendant nodes,
	 * bot not replace self or inserts neighbor nodes.
	 */
	export function outputChildren(atNode: ts.Node): ts.Node {
		return ts.visitEachChild(atNode, (child: ts.Node) => {
			return outputSelf(child)
		}, transformContext)
	}

	/** 
	 * Output node by specified raw node.
	 * It overwrites all descendant nodes,
	 * and may replace self, but will not be removed or inserts neighbor nodes.
	 */
	export function outputReplaceableChildren(atNode: ts.Node): ts.Node {
		let items = getOrderedItems(atNode)
		if (!items) {
			return outputChildren(atNode)
		}

		let replace = items.filter(item => item.position === InterpolationPosition.Replace)
		if (replace.length > 1) {
			throw new Error(`Only one replace is allowed, happen at "${helper.getFullText(atNode)}"!`)
		}

		if (replace.length > 0) {
			let replaced = replace[0].replace!()
			return Array.isArray(replaced) ? replaced[0] : replaced
		}

		return outputChildren(atNode)
	}

	/** 
	 * Output node by specified raw node.
	 * It may overwrite all descendant nodes,
	 * and may replace itself.
	 * If `addNeighbors` is `true`, will output all neighbor nodes.
	 */
	export function outputSelf(atNode: ts.Node, options: OutputOptions = {}): ts.Node | ts.Node[] | undefined {
		let items = getOrderedItems(atNode)
		if (!items) {
			return outputChildren(atNode)
		}

		let canInsert = options.canInsert ?? true
		let canRemove = options.canRemove ?? true
		let canReplace = options.canReplace ?? true

		let prependNodes = items.filter(item => item.position === InterpolationPosition.Prepend)
			.map(item => item.exps!()).flat()

		let appendNodes = items.filter(item => item.position === InterpolationPosition.Append)
			.map(item => item.exps!()).flat()

		let replace = items.filter(item => item.position === InterpolationPosition.Replace)
		if (canReplace && replace.length > 1) {
			throw new Error(`Only one replace is allowed, happen at "${helper.getFullText(atNode)}"!`)
		}

		let remove = items.find(item => item.position === InterpolationPosition.Remove)
		let node: ts.Node | ts.Node[] | undefined

		if (canRemove && remove) {
			node = undefined
		}
		else if (canReplace && replace.length > 0) {
			node = replace[0].replace!()

			if (prependNodes.length > 0 || appendNodes.length > 0) {
				let childNodes = [...prependNodes, ...appendNodes]
				console.warn(`Child nodes "${childNodes.map(n => helper.getFullText(n)).join(', ')}" have been dropped!`)
			}
		}
		else {
			node = outputChildren(atNode)

			if (prependNodes.length > 0 || appendNodes.length > 0) {
				node = updatePending(node, prependNodes, appendNodes)
			}
		}

		if (canInsert) {
			let beforeNodes = items.filter(item => item.position === InterpolationPosition.Before)
				.map(item => item.exps!()).flat()

			let afterNodes = items.filter(item => item.position === InterpolationPosition.After)
				.map(item => item.exps!()).flat()

			if (beforeNodes.length > 0 || afterNodes.length > 0) {
				node = replaceToAddNeighborNodes(atNode, node, beforeNodes, afterNodes)
			}
		}

		// console.log('-------------------------------------')
		// console.log('FROM', helper.getText(VisitTree.getNode(index)))
		// console.log('TO', Array.isArray(node) ? node.map(n => helper.getText(n)) : node ? helper.getText((node)) : 'NONE')

		return node && Array.isArray(node) && node.length === 1 ? node[0] : node
	}

	/** 
	 * Output an unique node.
	 * It requires to output an unique node.
	 * `canInsert` of `options` will be forced to `false`.
	 */
	export function outputUniqueSelf(atNode: ts.Node, options: OutputOptions = {}): ts.Node {
		options.canInsert = false

		let node = Interpolator.outputSelf(atNode, options)

		if (!node) {
			throw new Error(`"${helper.getFullText(atNode)}" has been removed!`)
		}

		if (Array.isArray(node)) {
			throw new Error(`"${helper.getFullText(atNode)}" has been replaced to several!`)
		}

		return node
	}


	/** Get ordered interpolation items.*/
	function getOrderedItems(atNode: ts.Node) {
		let items = Interpolations.get(atNode)
		if (!items) {
			return undefined
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

		return items
	}


	/** Try to replace node to make it can contain neighbor nodes. */
	function replaceToAddNeighborNodes(
		atNode: ts.Node,
		node: ts.Node | ts.Node[] | undefined,
		beforeNodes: ts.Node[],
		afterNodes: ts.Node[]
	): ts.Node | ts.Node[] {
		let rawParent = atNode.parent

		// Insert statements.
		if (Packer.canPutStatements(rawParent)) {
			let list = arrangeNeighborNodes(node, beforeNodes, afterNodes)
			return Packer.toStatements(list)
		}

		// Extend to block and insert statements.
		else if (Packer.canExtendToPutStatements(atNode)) {
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
		else if (Packer.shouldBeUnique(atNode)) {
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