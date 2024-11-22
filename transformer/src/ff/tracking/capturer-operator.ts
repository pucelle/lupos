import type TS from 'typescript'
import {Helper, VisitTree, ts, FlowInterruptionTypeMask, ScopeTree, HashItem} from '../../core'
import {AccessReferences} from './access-references'
import {removeFromList} from '../../utils'
import {CapturedItem, TrackingCapturer} from './capturer'
import {TrackingScope} from './scope'
import {TrackingScopeTypeMask} from './scope-tree'



/** 
 * It attaches to each capturer,
 * help to move and modify captured.
 */
export class TrackingCapturerOperator {

	/** Hash a captured item. */
	static hashCapturedItem(item: CapturedItem): HashItem {
		if (item.expIndex !== undefined) {
			let hash = ScopeTree.hashIndex(item.expIndex)
			let name = hash.name + item.keys!.map(key => `[${key}]`).join('')
	
			return {
				...hash,
				name,
			}
		}
		else {
			return ScopeTree.hashIndex(item.index)
		}
	}
		
	/** Get intersected items across capturers. */
	static intersectCapturedItems(capturers: TrackingCapturer[]): CapturedItem[] {
		if (capturers.length === 0) {
			return []
		}

		let map: Map<string, number>

		for (let i = 0; i < capturers.length; i++) {
			let capturer = capturers[i]
			let ownMap: Map<string, number> = new Map()

			// Only codes of the first item is always running.
			for (let item of capturer.captured[0].items) {

				// Has been referenced, ignore always.
				if (AccessReferences.hasExternalAccessReferenced(item.index, true)) {
					continue
				}

				let hashName = TrackingCapturerOperator.hashCapturedItem(item).name + '_of_capture_type_' + item.type
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


	readonly capturer: TrackingCapturer
	readonly scope: TrackingScope
	
	constructor(capturer: TrackingCapturer) {
		this.capturer = capturer
		this.scope = capturer.scope
	}

	/** 
	 * Move captured indices to an ancestral, target capturer.
	 * If a node with captured index use local variables and can't be moved, leave it.
	 */
	safelyMoveCapturedOutwardTo(toCapturer: TrackingCapturer) {
		let indices = this.capturer.captured[0].items
		if (indices.length === 0) {
			return
		}

		let residualIndices = toCapturer.operator.safelyMoveSomeCapturedOutwardFrom(indices, this.capturer)
		this.capturer.captured[0].items = residualIndices
	}

	/** 
	 * Try to move captured indices to self.
	 * `fromCapturer` locates where indices move from.
	 * Returns residual indices that failed to move.
	 */
	safelyMoveSomeCapturedOutwardFrom(items: CapturedItem[], fromCapturer: TrackingCapturer): CapturedItem[] {

		// Locate which captured item should move indices to.
		// Find the first item `toIndex` larger in child-first order.
		let group = this.capturer.captured.find(item => {
			return VisitTree.isFollowingOfOrEqualInChildFirstOrder(item.toIndex, fromCapturer.scope.visitIndex)
		}) ?? this.capturer.latestCaptured

		// Note these are not tracking scopes.
		let fromScope = fromCapturer.scope.getDeclarationScope()
		let toScope = this.scope.getDeclarationScope()

		let scopesLeaved = ScopeTree.findWalkingOutwardLeaves(fromScope, toScope)
		let residualItems: CapturedItem[] = []

		for (let item of items) {
			let hashed = TrackingCapturerOperator.hashCapturedItem(item)

			// Leave scopes which contain any referenced variable.
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
	moveCapturedBackwardTo(toCapturer: TrackingCapturer) {
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
				if (AccessReferences.hasExternalAccessReferenced(item.index, true)) {
					continue
				}

				let hashName = TrackingCapturerOperator.hashCapturedItem(item).name

				if (ownHashes.has(hashName)) {
					removeFromList(group.items, item)
				}
				else {
					ownHashes.add(hashName)
				}
			}

			// Every time after update hash set,
			// recursively eliminating not processed child contexts in the preceding.
			for (; startChildIndex < this.scope.children.length; startChildIndex++) {
				let child = this.scope.children[startChildIndex]

				if (!VisitTree.isPrecedingOfOrEqual(child.visitIndex, group.toIndex)) {
					break
				}

				child.capturer.operator.eliminateRepetitiveRecursively(ownHashes)
			}
			
			// Break by yield or await.
			if (group.flowInterruptedBy & FlowInterruptionTypeMask.YieldLike) {
				ownHashes.clear()
			}
		}

		// Last captured item may have wrong `toIndex`, here ensure to visit all child contexts.
		for (; startChildIndex < this.scope.children.length; startChildIndex++) {
			let child = this.scope.children[startChildIndex]

			// not function, or instantly run function.
			if ((child.type & TrackingScopeTypeMask.FunctionLike) === 0
				|| (child.type & TrackingScopeTypeMask.InstantlyRunFunction)
			) {
				child.capturer.operator.eliminateRepetitiveRecursively(ownHashes)
			}
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
					name = Helper.access.getPropertyText(node)
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

		for (let child of this.scope.children) {
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

		for (let child of this.scope.children) {
			child.capturer.operator.removeCapturedIndicesRecursively(toRemove)
		}
	}
}