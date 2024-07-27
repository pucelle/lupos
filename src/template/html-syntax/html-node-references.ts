import {HTMLNode, HTMLTree} from './html-node'


/** A node, and all the children which has any descendant been referenced. */
interface DeepReferenceItem {
	node: HTMLNode
	siblingIndex: number
	children: DeepReferenceItem[]
}

interface ReferenceOutputItem {

	/** Node reference index. */
	index: number

	/** The node reference index where visit from. */
	visitFromIndex: number

	/** The child index sequence. */
	visitSteps: number[]
}


export class HTMLNodeReferences {

	readonly tree: HTMLTree
	private indexSeed = 0
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

		this.references.set(node, ++this.indexSeed)

		return this.indexSeed
	}

	/** Whether node has been referenced. */
	hasReferenced(node: HTMLNode): boolean {
		return this.references.has(node)
	}

	/** Get reference index of a node, which must have been referenced. */
	getReferenceIndex(node: HTMLNode): number {
		return this.references.get(node)!
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
			let index = this.getReferenceIndex(item.node)

			yield {
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
			let index = ++this.indexSeed

			yield {
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