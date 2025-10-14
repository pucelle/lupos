import * as ts from 'typescript'
import {VisitTree, DeclarationScopeTree, helper, FlowInterruptionTypeMask} from '../../core'
import {removeFromList} from '../../utils'
import {CapturedItem, TrackingCapturer} from './capturer'
import {TrackingArea} from './area'
import {TrackingAreaTree, TrackingAreaTypeMask} from './area-tree'
import {CapturedHash, CapturedHashing, CapturedHashMap} from './captured-hashing'


/** 
 * It attaches to each capturer,
 * help to move and modify captured.
 */
export class TrackingCapturerOperator {

	readonly capturer: TrackingCapturer
	readonly area: TrackingArea
	
	constructor(capturer: TrackingCapturer) {
		this.capturer = capturer
		this.area = capturer.area
	}

	/** Normally move captured items to an sibling capturer. */
	moveCapturedTo(toCapturer: TrackingCapturer) {
		let items = this.capturer.captured[0].items
		if (items.length === 0) {
			return
		}

		let group = this.capturer.latestCaptured
		toCapturer.captured[0].items.push(...group.items)
		group.items = []
	}

	/** 
	 * Move captured items to an ancestral, target capturer.
	 * If a node with captured index use local variables and can't be moved, leave it.
	 */
	safelyMoveCapturedOutwardTo(toCapturer: TrackingCapturer) {
		let items = this.capturer.captured[0].items
		if (items.length === 0) {
			return
		}

		let residualItems = this.safelyMoveCapturedItemsOutwardTo(items, toCapturer)
		this.capturer.captured[0].items = residualItems
	}

	/** 
	 * Try to move captured items to self.
	 * `fromCapturer` locates where items move from.
	 * Returns residual items that failed to move.
	 */
	safelyMoveCapturedItemsOutwardTo(items: Iterable<CapturedItem>, toCapturer: TrackingCapturer): CapturedItem[] {

		// Note these are declaration scopes, not tracking scopes.
		let fromScope = this.area.getDeclarationScope()
		let toScope = toCapturer.area.getDeclarationScope()

		let scopesLeaves = DeclarationScopeTree.findWalkingOutwardLeaves(fromScope, toScope)
		let residualItems: CapturedItem[] = []

		// `for (let ... of await ...)`, moves tracking codes after, not before.
		let haveAwaitExpressionInLeaves = false

		for (let scopeLeaves of scopesLeaves) {
			let trackingScope = TrackingAreaTree.get(scopeLeaves.node)
			if (!trackingScope) {
				continue
			}

			if ((trackingScope.type & TrackingAreaTypeMask.Iteration) === 0) {
				continue
			}

			let nonContentChildren = trackingScope.children.filter(s => (s.type & TrackingAreaTypeMask.IterationContent) === 0)
			haveAwaitExpressionInLeaves = nonContentChildren.some(s => s.state.flowInterruptionType & FlowInterruptionTypeMask.Await)

			if (haveAwaitExpressionInLeaves) {
				break
			}
		}

		// Locate which captured group should move items to.
		// Find the first item which's toNode in the following, or be ancestor of current node.
		// If can't find, use the last one.
		let group = toCapturer.captured.find(item => {
			return haveAwaitExpressionInLeaves
				? VisitTree.isPrecedingOfOrEqual(this.area.node, item.toNode)
				: VisitTree.isPrecedingOfOrEqualInChildFirstOrder(this.area.node, item.toNode)
		}) ?? toCapturer.latestCaptured

		for (let item of items) {
			let hashed = CapturedHashing.hash(item)

			// Leave scopes which contain any referenced variable.
			if (hashed.usedScopes.some(i => scopesLeaves.includes(i))) {
				residualItems.push(item)
			}
			else {
				group.items.push(item)
			}
		}

		return residualItems
	}

	/** 
	 * Move iteration captured which uses dynamic index declared in for statement outward.
	 * `for (let i; ...) {a[i]}` -> `for (...) {}; track(a, '');`
	 */
	moveDynamicIndexedCapturedOutward(toCapturer: TrackingCapturer) {
		let items = this.capturer.captured[0].items
		if (items.length === 0) {
			return
		}

		let dynamicIndexed: CapturedItem[] = []

		for (let item of items) {

			// It uses static key.
			if (item.exp) {
				continue
			}

			if (!ts.isElementAccessExpression(item.node)) {
				continue
			}

			let index = item.node.argumentExpression
			let isDynamicIndex = !ts.isStringLiteral(index) && !ts.isNumericLiteral(index)
			if (!isDynamicIndex) {
				continue
			}

			dynamicIndexed.push({
				node: item.node,
				type: item.type,
				exp: item.node.expression,
				key: '',
				referencedAtInternal: false
			})
		}

		// No need to delete dynamic indexed, will be removed by following repetitive elimination.
		this.safelyMoveCapturedItemsOutwardTo(dynamicIndexed, toCapturer)
	}

	/** Eliminate repetitive captured with an outer hash. */
	eliminateRepetitiveRecursively(hashMap: CapturedHashMap) {
		let ownHashMap = hashMap.clone()
		let startChildIndex = 0

		for (let group of this.capturer.captured) {
			let hashes: CapturedHash[] = []

			for (let item of group.items) {

				// Has been referenced, will be replaced.
				if (item.referencedAtInternal) {
					continue
				}

				let hashed = CapturedHashing.hash(item)

				if (!ownHashMap.covers(hashed)) {
					ownHashMap.add(hashed)
				}

				hashes.push(hashed)
			}

			// Remove items than have been covered.
			for (let hash of hashes) {
				if (!ownHashMap.has(hash)) {
					removeFromList(group.items, hash.item)
				}
			}

			// Every time after updated hash map,
			// recursively eliminating not processed child contexts in the preceding.
			for (; startChildIndex < this.area.children.length; startChildIndex++) {
				let child = this.area.children[startChildIndex]

				// Child must in the preceding or equal of current group `toNode`.
				if (!VisitTree.isPrecedingOfOrEqual(child.node, group.toNode)) {
					break
				}

				child.capturer.operator.eliminateRepetitiveRecursively(ownHashMap)
			}
			
			// Break by yield or await, clear hash map.
			if (group.breakByAsync) {
				ownHashMap.clear()
			}
		}

		// Last captured item may have wrong `toNode` because it haven't been break.
		// Here ensure to visit all rest child contexts.
		for (; startChildIndex < this.area.children.length; startChildIndex++) {
			let child = this.area.children[startChildIndex]

			// Not function, or instantly run function.
			if ((child.type & TrackingAreaTypeMask.FunctionLike) === 0
				|| (child.type & TrackingAreaTypeMask.InstantlyRunFunction)
			) {
				child.capturer.operator.eliminateRepetitiveRecursively(ownHashMap)
			}
		}
	}

	/** Get private captured of captured item. */
	getPrivatePropertyCaptured(item: CapturedItem, ofClass: ts.ClassLikeDeclaration):
		{node: ts.Node, key: string, type: 'get' | 'set'} | undefined
	{
		let {node, type, key} = item

		let propDecls = helper.symbol.resolveDeclarations(node, helper.isPropertyOrGetSetAccessor)
		if (!propDecls || propDecls.length === 0) {
			return undefined
		}

		let propOfClass = propDecls.every(p => p.parent === ofClass)
		if (!propOfClass) {
			return undefined
		}

		let allBePrivate = propDecls.every(p => {
			return p.modifiers
				&& p.modifiers.find((n: ts.ModifierLike) => n.kind === ts.SyntaxKind.PrivateKeyword)
		})

		if (!allBePrivate) {
			return undefined
		}

		if (key === undefined && helper.access.isAccess(node)) {
			key = helper.access.getPropertyText(node)
		}

		if (!key || typeof key === 'number') {
			return undefined
		}

		return {
			key,
			node,
			type,
		}
	}

	/** Remove captured recursively. */
	removeCapturedRecursively(toRemove: Set<ts.Node>) {
		for (let item of this.capturer.captured) {
			item.items = item.items.filter(item => {
				return !toRemove.has(item.node)
			})
		}

		for (let child of this.area.children) {
			child.capturer.operator.removeCapturedRecursively(toRemove)
		}
	}
}