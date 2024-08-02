import {VariableNames} from '../parsers/variable-names'
import {HTMLNode, HTMLTree} from './html-node'


/** A node, and all the children which has any descendant been referenced. */
interface DeepReferenceItem {
	node: HTMLNode
	siblingIndex: number
	children: DeepReferenceItem[]
}

interface ReferenceOutputItem {

	type: ReferenceOutputType

	/** Node reference index. */
	index: number

	/** The node reference index where visit from. */
	visitFromIndex: number

	/** The child index sequence. */
	visitSteps: number[]
}

enum ReferenceOutputType {
	DirectlyReference,
	IntermediateReference,
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
	reference(node: HTMLNode): number {
		if (this.references.has(node)) {
			return this.references.get(node)!
		}

		let index = VariableNames.getDoublyUniqueIndex('directly', this)
		this.references.set(node, index)

		return index
	}

	/** 
	 * Reference node if not, and return it's reference variable name.
	 * Like `$node_0`.
	 */
	getReferenceName(node: HTMLNode) {
		let nodeIndex = this.reference(node)
		return VariableNames.node + '_' + nodeIndex
	}

	/** Whether node has been referenced. */
	hasReferenced(node: HTMLNode): boolean {
		return this.references.has(node)
	}

	/** Output all reference sequence. */
	output(): Iterable<ReferenceOutputItem> {
		let tree = this.makeDeepReferenceTree()
		if (!tree) {
			return []
		}

		return this.outputItem(tree, 0, [])
	}

	/** Made deep reference tree. */
	private makeDeepReferenceTree(): DeepReferenceItem | null {
		return this.makeDeepReferenceItem(this.tree, 0)
	}

	private makeDeepReferenceItem(node: HTMLNode, siblingIndex: number): DeepReferenceItem | null {
		let children: DeepReferenceItem[] = []

		for (let i = 0; i < node.children.length; i++) {
			let child = node.children[i]
			let item = this.makeDeepReferenceItem(child, i)
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
	private *outputItem(item: DeepReferenceItem, fromIndex: number, parentalSteps: number[]): Iterable<ReferenceOutputItem> {
		let steps = [...parentalSteps, item.siblingIndex]

		// Output directly
		if (this.hasReferenced(item.node)) {
			let index = this.references.get(item.node)!

			yield {
				type: ReferenceOutputType.DirectlyReference,
				index,
				visitFromIndex: fromIndex,
				visitSteps: steps,
			}
			
			for (let child of item.children) {
				yield *this.outputItem(child, index, [])
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
			let index = VariableNames.getDoublyUniqueIndex('intermediate', this)

			yield {
				type: ReferenceOutputType.IntermediateReference,
				index,
				visitFromIndex: fromIndex,
				visitSteps: steps,
			}
			
			for (let child of item.children) {
				yield *this.outputItem(child, index, [])
			}
		}

		// Add step to current path
		else {
			for (let child of item.children) {
				yield *this.outputItem(child, fromIndex, steps)
			}
		}
	}
}