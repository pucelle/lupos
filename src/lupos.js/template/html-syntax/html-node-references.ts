import {VariableNames} from '../parsers/variable-names'
import {HTMLNode} from './html-node'
import {HTMLTree} from './html-tree'


/** A node, and all the children which has any descendant been referenced. */
interface DeepReferenceItem {
	node: HTMLNode
	siblingIndex: number
	children: DeepReferenceItem[]
}

export interface ReferenceOutputItem {

	/** Visiting node. */
	node: HTMLNode

	/** The node where visit from. */
	visitFromNode: HTMLNode

	/** 
	 * The child index sequence, can be `-1` when been the last child.
	 * If should ignore node when doing output, like template node, be `null`.
	 */
	visitSteps: number[] | null
}


export class HTMLNodeReferences {

	readonly tree: HTMLTree
	private references: Map<HTMLNode, number> = new Map()

	constructor(tree: HTMLTree) {
		this.tree = tree
	}

	/** 
	 * Add a reference after known a node should be referenced.
	 * Returns the reference index.
	 */
	refAsIndex(node: HTMLNode): number {
		if (this.references.has(node)) {
			return this.references.get(node)!
		}

		let index = VariableNames.getUniqueIndex(this)
		this.references.set(node, index)

		return index
	}

	/** 
	 * Reference node if not, and return it's reference variable name.
	 * Like `$node_0`.
	 */
	refAsName(node: HTMLNode) {
		let nodeIndex = this.refAsIndex(node)
		return VariableNames.node + '_' + nodeIndex
	}

	/** 
	 * Get already referenced name.
	 * Like `$node_0`.
	 */
	getRefedName(node: HTMLNode) {
		let nodeIndex = this.references.get(node)!
		return VariableNames.node + '_' + nodeIndex
	}

	/** Whether node has been referenced. */
	hasReferenced(node: HTMLNode): boolean {
		return this.references.has(node)
	}

	/** Output all reference sequence. */
	output(): Iterable<ReferenceOutputItem> {
		let refTree = this.makeDeepReferenceTree()
		if (!refTree) {
			return []
		}

		return this.outputItem(refTree, this.tree, [])
	}

	/** Made deep reference tree. */
	private makeDeepReferenceTree(): DeepReferenceItem | null {
		return this.makeDeepReferenceItem(this.tree, 0)
	}

	private makeDeepReferenceItem(node: HTMLNode, siblingIndex: number): DeepReferenceItem | null {
		let children: DeepReferenceItem[] = []

		for (let i = 0; i < node.children.length; i++) {
			let child = node.children[i]

			// Last sibling -> `-1`
			let siblingIndex = i > 0 && i === node.children.length - 1 ? -1 : i

			let item = this.makeDeepReferenceItem(child, siblingIndex)

			if (item) {
				children.push(item)
			}
		}

		if (this.references.has(node) || children.length > 0) {
			return {
				node,
				siblingIndex,
				children,
			}
		}

		return null
	}

	/** `steps` doesn't include current item sibling index. */
	private *outputItem(item: DeepReferenceItem, visitFromNode: HTMLNode, parentalSteps: number[]): Iterable<ReferenceOutputItem> {
		let steps: number[] = [...parentalSteps]
		let visitSteps: number[] | null = steps

		// No visit step for tree.
		if (item.node !== this.tree) {
			steps.push(item.siblingIndex)
		}

		// Template tags get removed, no visit steps, but still iterate them.
		if (item.node.tagName === 'template'
			&& item.node.parent === this.tree
		) {
			visitSteps = null
		}

		// Output directly
		if (this.hasReferenced(item.node)) {

			yield {
				node: item.node,
				visitFromNode,
				visitSteps,
			}

			for (let child of item.children) {
				yield *this.outputItem(child, item.node, [])
			}
		}

		// When more than one descendant nodes get referenced,
		// we want the path to reference descendant nodes shorter.
		// 
		// a.b.c.d
		// a.b.c.e
		// ->
		// f = a.b.c
		// f.d
		// f.e
		else if (item.children.length > 1) {
			this.refAsIndex(item.node)

			yield {
				node: item.node,
				visitFromNode,
				visitSteps,
			}

			for (let child of item.children) {
				yield *this.outputItem(child, item.node, [])
			}
		}

		// Add step to current path
		else {
			for (let child of item.children) {
				yield *this.outputItem(child, visitFromNode, steps)
			}
		}
	}
}