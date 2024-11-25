import {VariableNames} from '../parsers'
import {HTMLNode, HTMLRoot} from '../../lupos-ts-module'


/** A node, and all the children which has any descendant been referenced. */
interface DeepReferenceItem {
	node: HTMLNode
	siblingIndex: number
	children: DeepReferenceItem[]
}

export interface ReferenceItem {

	type: ReferenceItemTypeMask

	/** Visiting node. */
	node: HTMLNode

	/** The node where visit from. */
	fromNode: HTMLNode

	/** Steps visit from `visitFromNode`. */
	visitSteps: VisitStep[] | null
}

/** 
 * The child node and index sequence, index can be `-1` when been the last child.
 * If should ignore node when doing output, like template node, be `null`.
 */
interface VisitStep {
	node: HTMLNode
	index: number
}

export enum ReferenceItemTypeMask {

	/** Reference node as variable for some binding like. */
	Reference = 1,

	/** Reference node as temp variable for shorter descendant visiting path. */
	PassingBy = 2,
}


export class HTMLNodeReferences {

	readonly root: HTMLRoot
	private referencedNodes: Set<HTMLNode> = new Set()
	private determined: boolean = false
	private indexMap: Map<HTMLNode, number> = new Map()
	private referenceItems: ReferenceItem[] = []

	constructor(root: HTMLRoot) {
		this.root = root
	}

	/** Reference node if not */
	ref(node: HTMLNode) {
		this.referencedNodes.add(node)
	}

	/** Whether node has been referenced. */
	hasRefed(node: HTMLNode): boolean {
		return this.referencedNodes.has(node)
	}

	/** 
	 * Get already referenced name.
	 * Like `$node_0`.
	 */
	getRefedName(node: HTMLNode) {
		if (!this.determined) {
			throw new Error(`References have not been determined!`)
		}

		let nodeIndex = this.indexMap.get(node)!
		return VariableNames.node + '_' + nodeIndex
	}

	/** 
	 * Lock all existing references.
	 * Later can call `getRefedName`, but not `refAsName` and `refAsIndex`.
	 */
	determine() {
		this.determined = true

		let refTree = this.makeDeepReferenceTree()
		if (!refTree) {
			return
		}

		this.referenceItems = [...this.walkReferenceItem(refTree, this.root, [])]
	}

	/** Made deep reference tree. */
	private makeDeepReferenceTree(): DeepReferenceItem | null {
		return this.makeDeepReferenceItem(this.root, 0)
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

		if (this.referencedNodes.has(node) || children.length > 0) {
			return {
				node,
				siblingIndex,
				children,
			}
		}

		return null
	}

	/** `steps` doesn't include current item sibling index. */
	private *walkReferenceItem(item: DeepReferenceItem, visitFromNode: HTMLNode, parentalSteps: VisitStep[]): Iterable<ReferenceItem> {
		let node = item.node
		let steps: VisitStep[] = [...parentalSteps]
		let trueSteps: VisitStep[] | null = steps
		let type: ReferenceItemTypeMask | 0 = 0

		// No visit step for tree.
		if (node !== this.root) {
			steps.push({node: item.node, index: item.siblingIndex})
		}

		// Template tags get removed, no visit steps, but still iterate them.
		if (node.tagName === 'template'
			&& node.parent === this.root
		) {
			trueSteps = null
		}

		// Output directly.
		if (this.hasRefed(node)) {
			type |= ReferenceItemTypeMask.Reference
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
		if (item.children.length > 1 && node !== this.root && trueSteps !== null) {
			type |= ReferenceItemTypeMask.PassingBy
		}

		// Output node, and output descendants relative to it.
		if (type !== 0) {
			this.refAsIndex(node)

			yield {
				type,
				node,
				fromNode: visitFromNode,
				visitSteps: trueSteps,
			}
			
			for (let child of item.children) {
				if (trueSteps) {
					yield* this.walkReferenceItem(child, node, [])
				}
				else {
					yield* this.walkReferenceItem(child, visitFromNode, steps)
				}
			}
		}

		// Add step to current path.
		else {
			for (let child of item.children) {
				yield* this.walkReferenceItem(child, visitFromNode, steps)
			}
		}
	}

	/** Assign an index to node. */
	private refAsIndex(node: HTMLNode) {
		let index = VariableNames.getUniqueIndex(this)
		this.indexMap.set(node, index)
		this.referencedNodes.add(node)
	}

	/** Output reference items. */
	output(): ReferenceItem[] {
		return this.referenceItems
	}
}