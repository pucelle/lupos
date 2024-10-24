import type TS from 'typescript'
import {Helper, VisitTree, ts, FlowInterruptionTypeMask, ScopeTree, HashItem} from '../../base'
import {AccessReferences} from './access-references'
import {removeFromList} from '../../utils'
import {CapturedItem, ContextCapturer} from './context-capturer'
import {Context} from './context'



function hashCapturedItem(item: CapturedItem): HashItem {
	if (item.expIndex !== undefined) {
		let hash = ScopeTree.hashIndex(item.index)
		let name = item.keys!.map(key => `[${key}]`).join('')

		return {
			...hash,
			name,
		}
	}
	else {
		return ScopeTree.hashIndex(item.index)
	}
}


/** 
 * It attaches to each context,
 * Captures get and set expressions, and remember reference variables.
 */
export class ContextCapturerOperator {

	/** Get intersected items across capturers. */
	static intersectCapturedItems(capturers: ContextCapturer[]): CapturedItem[] {
		let map: Map<string, number>

		for (let i = 0; i < capturers.length; i++) {
			let capturer = capturers[i]
			let ownMap: Map<string, number> = new Map()

			// Only codes of the first item is always running.
			for (let item of capturer.captured[0].items) {

				// Has been referenced, ignore always.
				if (AccessReferences.isDescendantAccessReferenced(item.index, true)) {
					continue
				}

				let hashName = hashCapturedItem(item).name + '_of_capture_type_' + item.type
				ownMap.set(hashName, item.index)
			}

			if (i === 0) {
				map = ownMap
			}
			else {
				for (let key of [...map!.keys()]) {
					if (!ownMap.has(key)) {
						map!.delete(key)
					}
				}
			}

			if (map!.size === 0) {
				break
			}
		}

		let values = [...map!.values()]
		return capturers[0].captured[0].items.filter(index => values.includes(index.index))
	}


	readonly capturer: ContextCapturer
	readonly context: Context
	
	constructor(capturer: ContextCapturer) {
		this.capturer = capturer
		this.context = capturer.context
	}

	/** 
	 * Move captured indices to an ancestral, target capturer.
	 * If a node with captured index use local variables and can't be moved, leave it.
	 */
	moveCapturedOutwardTo(toCapturer: ContextCapturer) {
		let indices = this.capturer.captured[0].items
		if (indices.length === 0) {
			return
		}

		let residualIndices = toCapturer.operator.moveCapturedOutwardFrom(indices, this.capturer)
		this.capturer.captured[0].items = residualIndices
	}

	/** 
	 * Try to move captured indices to self.
	 * `fromCapturer` locates where indices move from.
	 * Returns residual indices that failed to move.
	 */
	moveCapturedOutwardFrom(items: CapturedItem[], fromCapturer: ContextCapturer): CapturedItem[] {

		// Locate which captured item should move indices to.
		// Find the first item `toIndex` larger in child-first order.
		let group = this.capturer.captured.find(item => {
			return VisitTree.isFollowingOfOrEqualInChildFirstOrder(item.toIndex, fromCapturer.context.visitIndex)
		}) ?? this.capturer.latestCaptured

		let fromScope = fromCapturer.context.getDeclarationScope()
		let toScope = this.context.getDeclarationScope()
		let scopesLeaved = ScopeTree.findWalkingOutwardLeaves(fromScope, toScope)
		let residualItems: CapturedItem[] = []

		for (let item of items) {
			let hashed = hashCapturedItem(item)

			// Leave contexts contain any referenced variable.
			if (hashed.usedScopes.some(i => scopesLeaved.includes(i))) {
				residualItems.push(item)
			}
			else {
				group.items.push(item)
			}
		}

		return residualItems
	}

	/** Move captured indices to an sibling capturer. */
	moveCapturedBackwardTo(toCapturer: ContextCapturer) {
		let indices = this.capturer.captured[0].items
		if (indices.length === 0) {
			return
		}

		let group = this.capturer.latestCaptured
		toCapturer.captured[0].items.push(...group.items)
		group.items = []
	}

	/** Eliminate repetitive captured with an outer hash. */
	eliminateRepetitiveRecursively(hashSet: Set<string>) {
		let ownHashes = new Set(hashSet)
		let startChildIndex = 0

		for (let group of this.capturer.captured) {
			for (let item of [...group.items]) {

				// Has been referenced, ignore always.
				if (AccessReferences.isDescendantAccessReferenced(item.index, true)) {
					continue
				}

				let hashName = hashCapturedItem(item).name

				if (ownHashes.has(hashName)) {
					removeFromList(group.items, item)
				}
				else {
					ownHashes.add(hashName)
				}

				// Break by yield or await.
				if ((group.flowInterruptedBy & FlowInterruptionTypeMask.YieldLike) > 0) {
					ownHashes.clear()
				}
			}

			// Every time after update hash set,
			// recursively eliminating not processed child contexts in the preceding.
			for (; startChildIndex < this.context.children.length; startChildIndex++) {
				let child = this.context.children[startChildIndex]

				if (!VisitTree.isPrecedingOfOrEqual(child.visitIndex, group.toIndex)) {
					break
				}

				child.capturer.operator.eliminateRepetitiveRecursively(ownHashes)
			}
		}

		// Last captured item may have wrong `toIndex`, here ensure to visit all child contexts.
		for (; startChildIndex < this.context.children.length; startChildIndex++) {
			let child = this.context.children[startChildIndex]
			child.capturer.operator.eliminateRepetitiveRecursively(ownHashes)
		}
	}

	/** Find private class property declaration from captured. */
	*walkPrivateCaptured(ofClass: TS.ClassLikeDeclaration):
		Iterable<{name: string, index: number, type: 'get' | 'set'}>
	{
		for (let item of this.capturer.captured) {
			for (let {index, type, keys} of item.items) {
				let node = VisitTree.getNode(index)

				let propDecls = Helper.symbol.resolveDeclarations(node, Helper.isPropertyOrGetSetAccessor)
				if (!propDecls || propDecls.length === 0) {
					continue
				}

				let propOfClass = propDecls.every(p => p.parent === ofClass)
				if (!propOfClass) {
					continue
				}

				let allBePrivate = propDecls.every(p => {
					return p.modifiers
						&& p.modifiers.find((n: TS.ModifierLike) => n.kind === ts.SyntaxKind.PrivateKeyword)
				})

				if (!allBePrivate) {
					continue
				}
				
				let name: string | null = null
				if (Helper.access.isAccess(node)) {
					name = Helper.access.getNameText(node)
				}

				// `let {value} = this`
				else if (keys && keys.length > 0 && typeof keys[0] === 'string') {
					name = keys[0]
				}

				if (!name) {
					continue
				}

				yield {
					name,
					index,
					type,
				}
			}
		}

		for (let child of this.context.children) {
			yield* child.capturer.operator.walkPrivateCaptured(ofClass)
		}
	}

	/** Remove captured indices recursively. */
	removeCapturedIndicesRecursively(toRemove: Set<number>) {
		for (let item of this.capturer.captured) {
			item.items = item.items.filter(index => {
				return !toRemove.has(index.index)
			})
		}

		for (let child of this.context.children) {
			child.capturer.operator.removeCapturedIndicesRecursively(toRemove)
		}
	}
}