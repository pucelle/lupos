import {VariableNames} from '../parsers'
import {HTMLNode, HTMLRoot} from '../../lupos-ts-module'


/** 
 * For reference check, it firstly check for a rough
 * reference tree deeply, and then analyze it carefully.
 */
interface DeepReferenceCheck {
	node: HTMLNode
	siblingIndex: number

	/** 
	 * At beginning, all references from parent to each child.
	 * later, we made reference from marker to it's following siblings,
	 * 
	 * E.g.:
	 * A
	 * 	 B
	 *     C
	 * 	 D[marker]
	 *   E
	 *     F
	 *   G
	 *     H
	 * 
	 * References:
	 *   A -> B -> C
	 * 	 D -> E -> F
	 *   D -> E -> G -> H
	 */
	referenceCount: number

	children: DeepReferenceCheck[]
}

export interface ReferenceItem {

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
	 * For `Next` type, means how many next sibling steps.
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
	 * Later can call `getRefedName`, but not `refAsIndex`.
	 */
	determine() {
		this.determined = true

		let refTree = this.makeDeepReferenceCheck()
		if (!refTree) {
			return
		}

		this.makeReferenceMap(refTree, this.root, [])
	}

	/** Made deep reference tree. */
	private makeDeepReferenceCheck(): DeepReferenceCheck | null {
		return this.makeDeepReferenceCheckRecursively(this.root, 0)
	}

	private makeDeepReferenceCheckRecursively(node: HTMLNode, siblingIndex: number): DeepReferenceCheck | null {
		let children: DeepReferenceCheck[] = []
		let referenceCount = 0
		let previousMarker: DeepReferenceCheck | null = null
		let previousMarkerFollowed: DeepReferenceCheck | null = null

		// Reference itself.
		if (this.needReferenceNodes.has(node)) {
			referenceCount++
		}

		for (let i = 0; i < node.children.length; i++) {
			let child = node.children[i]
			let siblingIndex = i
			let item = this.makeDeepReferenceCheckRecursively(child, siblingIndex)

			if (!item) {
				continue
			}

			children.push(item)

			// Be a marker.
			if (item.node.markerId) {
				previousMarker = item
				previousMarkerFollowed = null
			}
			else if (previousMarker) {
				previousMarker.referenceCount++

				// A[marker] -> B -> C, B have one passing by reference.
				if (previousMarkerFollowed) {
					previousMarkerFollowed.referenceCount++
				}

				previousMarkerFollowed = item
			}

			// Reference from self to child.
			else {
				referenceCount++
			}
		}

		// child node `<template>` will be eliminated,
		// or child `<svg>` will be eliminated.
		let childBeEliminatedLevel = node === this.root && this.firstLevelWillBeEliminated
		if (!childBeEliminatedLevel) {
			for (let child of children) {

				// Have at least 2 references, reference it as passing by to shorter visit path.
				// 
				// A.B.C.D
				// A.B.C.E
				// ->
				// F = A.B.C
				// A.B.C.D -> F.D
				// A.B.C.E -> F.E
				//
				// A[marker] | B.C | D
				// Visit C or B both needs passing B, so we make it as a reference.

				if (!this.needReferenceNodes.has(child.node)
					&& child.referenceCount >= 2
				) {
					this.needRef(child.node)
				}
			}
		}

		if (this.needReferenceNodes.has(node) || children.length > 0) {
			return {
				node,
				siblingIndex,
				referenceCount,
				children,
			}
		}

		return null
	}

	/** Assign an index to node in parent-child order. */
	private makeRefIndex(node: HTMLNode) {
		let index = VariableNames.getUniqueIndex(this)
		this.indexMap.set(node, index)
	}

	/** `steps` doesn't include current item sibling index. */
	private makeReferenceMap(item: DeepReferenceCheck, visitFromNode: HTMLNode, levelSteps: VisitStep[]) {
		let node = item.node
		let selfSteps: VisitStep[] | null = null

		// Output node self, and output descendants relative to it.
		if (this.hasNeededRef(node)) {

			// Template tags will be replace by `$context.el`, 
			// so no need to visit steps, but still persist level steps for children.
			let beContextElement = node.tagName === 'template'
				&& node.parent === this.root
			
			if (!beContextElement) {
				selfSteps = levelSteps
			}

			// Ensure generating parent-child incremental index.
			this.makeRefIndex(node)

			this.referencedMap.set(node, {
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
		let afterMarker = false

		// Whether will eliminated child step level.
		let childBeEliminatedLevel = node === this.root && this.firstLevelWillBeEliminated
		
		for (let i = 0; i < item.children.length; i++) {
			let child = item.children[i]
	
			// May append more node before this node.
			let beMarker = !!child.node.markerId
			if (beMarker) {
				levelSteps = [{type: VisitStepType.Marker, node: child.node, index: 0}]
			}

			let childSteps = [...levelSteps]

			// Visit child.
			if (!beMarker
				&& !afterMarker
				&& !childBeEliminatedLevel
			) {
				childSteps.push({type: VisitStepType.ChildIndex, node: child.node, index: child.siblingIndex})
			}

			this.makeReferenceMap(child, visitFromNode, childSteps)

			afterMarker = afterMarker || beMarker

			if (afterMarker) {

				// If current child get referenced, redirect next sibling chain from it.
				if (this.referencedMap.has(child.node)) {
					visitFromNode = child.node
					levelSteps = []
				}

				// How many node next siblings steps for next item.
				let siblingIndexDiff = i < item.children.length - 1 ? item.children[i + 1].node.siblingIndex - child.node.siblingIndex : 1
				levelSteps.push({type: VisitStepType.NextSibling, node: child.node, index: siblingIndexDiff})
			}
		}
	}

	/** Output reference items. */
	output(): Iterable<ReferenceItem> {
		return this.referencedMap.values()
	}
}