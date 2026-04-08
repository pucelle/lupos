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

	/** Visit specified marker. */
	Marker,

	/** Visit from a fixed node for it's next sibling. */
	NextSibling,
}


export class HTMLNodeReferences {

	readonly root: HTMLRoot
	readonly firstLevelWillBeEliminated: boolean

	private determined: boolean = false
	private indexMap: Map<HTMLNode, number> = new Map()
	private needReferenceNodes: Set<HTMLNode> = new Set()
	private referencedMap: Map<HTMLNode, ReferenceItem> = new Map()

	constructor(root: HTMLRoot, firstLevelWillBeEliminated: boolean) {
		this.root = root
		this.firstLevelWillBeEliminated = firstLevelWillBeEliminated
	}

	/** Notify need to reference node. */
	needRef(node: HTMLNode) {
		this.needReferenceNodes.add(node)
	}

	/** Whether node has been referenced. */
	hasNeededRef(node: HTMLNode): boolean {
		return this.needReferenceNodes.has(node)
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

		if (this.needReferenceNodes.has(node) || children.length > 0) {
			return {
				node,
				siblingIndex,
				children,
			}
		}

		return null
	}

	/** `steps` doesn't include current item sibling index. */
	private makeReferenceMap(item: DeepReferenceCheck, visitFromNode: HTMLNode, levelSteps: VisitStep[], afterFingerPrintSibling: boolean) {
		let node = item.node
		let selfSteps: VisitStep[] | null = null
		let type: ReferenceCheckTypeMask | 0 = 0

		// Output directly.
		if (this.hasNeededRef(node)) {
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

		let selfBeEliminatedLevel = node.parent === this.root && this.firstLevelWillBeEliminated

		// Root node will be replaced by `$locator`,
		// context node `<template>` will be eliminated.
		// sometimes `<svg>` will be eliminated.
		if (!(node === this.root || selfBeEliminatedLevel)) {
			if (item.children.length > 1
				|| item.children.length === 1 && afterFingerPrintSibling
			) {
				type |= ReferenceCheckTypeMask.PassingBy
			}
		}

		// Output node self, and output descendants relative to it.
		if (type !== 0) {

			// Template tags will be replace by `$context.el`, 
			// so no need to visit steps, but still persist level steps for children.
			let beContextElement = node.tagName === 'template'
				&& node.parent === this.root
			
			if (!beContextElement) {
				selfSteps = levelSteps
			}

			this.refAsIndex(node)

			this.referencedMap.set(node, {
				type,
				node,
				fromNode: visitFromNode,
				visitSteps: selfSteps,
			})
		}

		// Visit child from current node.
		if (selfSteps) {
			visitFromNode = node
			levelSteps = []
		}

		// Means position is not stable, may add some more nodes before.
		let afterFingerPrint = false

		// Whether will eliminated child step level.
		let childBeEliminatedLevel = node === this.root && this.firstLevelWillBeEliminated
		
		for (let child of item.children) {
	
			// May append more node before this node.
			let haveFingerPrint = !!child.node.fingerPrintId
			if (haveFingerPrint) {
				levelSteps = [{type: VisitStepType.Marker, node: child.node, index: 0}]
			}

			let childSteps = [...levelSteps]

			// Visit child.
			if (!haveFingerPrint
				&& !afterFingerPrint
				&& !childBeEliminatedLevel
			) {
				childSteps.push({type: VisitStepType.ChildIndex, node: child.node, index: child.siblingIndex})
			}

			this.makeReferenceMap(child, visitFromNode, childSteps, afterFingerPrint)

			afterFingerPrint = afterFingerPrint || haveFingerPrint

			if (afterFingerPrint) {

				// If current child get referenced, redirect next sibling chain from it.
				if (this.referencedMap.has(child.node)) {
					visitFromNode = child.node
					levelSteps = []
				}

				// Visit next sibling.
				levelSteps.push({type: VisitStepType.NextSibling, node: child.node, index: 0})
			}
		}
	}

	/** Assign an index to node. */
	private refAsIndex(node: HTMLNode) {
		let index = VariableNames.getUniqueIndex(this)
		this.indexMap.set(node, index)
		this.needReferenceNodes.add(node)
	}

	/** Output reference items. */
	output(): Iterable<ReferenceItem> {
		return this.referencedMap.values()
	}
}