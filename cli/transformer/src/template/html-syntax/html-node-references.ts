import {VariableNames} from '../parsers'
import {HTMLNode, HTMLRoot} from '../../lupos-ts-module'


/** 
 * For reference check, it firstly check for a rough
 * reference tree deeply, and then analyze it carefully.
 */
interface DeepReferenceCheck {
	node: HTMLNode
	siblingIndex: number
	children: DeepReferenceCheck[]
}

export enum ReferenceCheckTypeMask {

	/** Reference node as variable for some binding like. */
	Reference = 1,

	/** Reference node as temp variable for shorter descendant visiting path. */
	PassingBy = 2,
}

export interface ReferenceItem {

	type: ReferenceCheckTypeMask

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
export interface VisitStep {
	type: VisitStepType
	node: HTMLNode

	/** 
	 * For `ChildIndex` type, means child node index.
	 * For `Next` type, means how many steps to visit next sibling.
	 */
	index: number
}

/** How to visit current node from source node. */
export const enum VisitStepType {

	/** Visit from parent and a child index. */
	ChildIndex,

	/** Visit from a fixed node for it's next sibling. */
	Next,
}


export class HTMLNodeReferences {

	readonly root: HTMLRoot
	private determined: boolean = false
	private indexMap: Map<HTMLNode, number> = new Map()
	private referencedNodes: Set<HTMLNode> = new Set()
	private referenceMap: Map<HTMLNode, ReferenceItem> = new Map()

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
	getRefedName(node: HTMLNode): string {
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

		let refTree = this.makeDeepReferenceCheck()
		if (!refTree) {
			return
		}

		this.makeReferenceMap(refTree, this.root, [], false)
	}

	/** Made deep reference tree. */
	private makeDeepReferenceCheck(): DeepReferenceCheck | null {
		return this.makeDeepReferenceCheckRecursively(this.root, 0)
	}

	private makeDeepReferenceCheckRecursively(node: HTMLNode, siblingIndex: number): DeepReferenceCheck | null {
		let children: DeepReferenceCheck[] = []

		for (let i = 0; i < node.children.length; i++) {
			let child = node.children[i]
			let siblingIndex = i
			let item = this.makeDeepReferenceCheckRecursively(child, siblingIndex)

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
	private makeReferenceMap(item: DeepReferenceCheck, visitFromNode: HTMLNode, parentalSteps: VisitStep[], afterFingerPrintSibling: boolean) {
		let node = item.node
		let levelSteps: VisitStep[] = [...parentalSteps]
		let selfSteps: VisitStep[] | null = null
		let type: ReferenceCheckTypeMask | 0 = 0

		// Visit comment node from comment compiling id.
		if (node.fingerPrintId) {
			levelSteps = [{type: VisitStepType.Next, node, index: 0}]
		}

		// Not visit step for tree.
		else if (node !== this.root) {
			levelSteps.push({type: VisitStepType.ChildIndex, node, index: item.siblingIndex})
		}

		// Output directly.
		if (this.hasRefed(node)) {
			type |= ReferenceCheckTypeMask.Reference
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
		if (node !== this.root && selfSteps !== null) {
			if (item.children.length > 1
				|| item.children.length === 1 && afterFingerPrintSibling
			) {
				type |= ReferenceCheckTypeMask.PassingBy
			}
		}

		// Output node, and output descendants relative to it.
		if (type !== 0) {
			selfSteps = levelSteps
			
			// Template tags will be replace by `$context.el`, 
			// so no need to visit steps.
			// Set to null to persist visiting from parent steps.
			if (node.tagName === 'template'
				&& node.parent === this.root
			) {
				selfSteps = null
			}

			this.refAsIndex(node)

			this.referenceMap.set(node, {
				type,
				node,
				fromNode: visitFromNode,
				visitSteps: selfSteps,
			})
		}
		else {
			selfSteps = null
		}

		// Means position is not stable, may add some more nodes before.
		let afterFingerPrint = false
		
		for (let child of item.children) {

			// May append more node before it.
			let haveFingerPrint = !!child.node.fingerPrintId

			// Visit child from current node.
			if (selfSteps) {
				this.makeReferenceMap(child, node, [], afterFingerPrint)
			}
			// For `<template>`, not break parent visiting link.
			else {
				this.makeReferenceMap(child, visitFromNode, levelSteps, afterFingerPrint)
			}

			if (haveFingerPrint) {
				levelSteps = [{type: VisitStepType.Next, node, index: 0}]
			}
			else if (afterFingerPrint) {

				// If current child get referenced, redirect next sibling chain from it.
				if (this.referenceMap.has(child.node)) {
					levelSteps = [{type: VisitStepType.Next, node: child.node, index: 1}]
				}
				else {
					levelSteps = [{type: VisitStepType.Next, node: levelSteps[0].node, index: levelSteps[0].index + 1}]
				}
			}

			afterFingerPrint = afterFingerPrint || haveFingerPrint
		}
	}

	/** Assign an index to node. */
	private refAsIndex(node: HTMLNode) {
		let index = VariableNames.getUniqueIndex(this)
		this.indexMap.set(node, index)
		this.referencedNodes.add(node)
	}

	/** Output reference items. */
	output(): Iterable<ReferenceItem> {
		return this.referenceMap.values()
	}
}