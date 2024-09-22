import type TS from 'typescript'
import {InterpolationContentType, AccessNode, Helper, Interpolator, InterpolationPosition, Visiting, ts, FlowInterruptionTypeMask, Scoping} from '../../base'
import {Context} from './context'
import {ContextTree, ContextTypeMask} from './context-tree'
import {AccessGrouper} from './access-grouper'
import {AccessReferences} from './access-references'
import {Optimizer} from './optimizer'
import {removeFromList} from '../../utils'
import {ContextState} from './context-state'


/** Captured item, will be inserted to a position. */
interface CapturedItem {
	position: InterpolationPosition
	indices: CapturedIndex[]
	toIndex: number
	flowInterruptedBy: number
}

/** Each capture indices and capture type. */
interface CapturedIndex {
	index: number
	type: 'get' | 'set'
}


/** 
 * It attaches to each context,
 * Captures get and set expressions, and remember reference variables.
 */
export class ContextCapturer {

	
	/** Get intersected indices across capturers. */
	static intersectIndices(capturers: ContextCapturer[]): CapturedIndex[] {
		let map: Map<string, number>

		for (let i = 0; i < capturers.length; i++) {
			let capturer = capturers[i]
			let ownMap: Map<string, number> = new Map()

			// Only codes of the first item is always running.
			for (let {index} of capturer.captured[0].indices) {

				// Has been referenced, ignore always.
				if (AccessReferences.isDescendantAccessReferenced(index)) {
					continue
				}

				let hashName = Scoping.hashIndex(index).name
				ownMap.set(hashName, index)
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
		return capturers[0].captured[0].indices.filter(index => values.includes(index.index))
	}


	readonly context: Context

	private captured: CapturedItem[]
	private latestCaptured!: CapturedItem
	private captureType: 'get' | 'set' | 'both' = 'get'

	constructor(context: Context, state: ContextState) {
		this.context = context

		this.resetLatestCaptured()
		this.captured = [this.latestCaptured]
		this.initCaptureType(state)
	}

	private resetLatestCaptured() {
		this.latestCaptured = {
			position: InterpolationPosition.Before,
			indices: [],
			toIndex: -1,
			flowInterruptedBy: 0,
		}
	}

	/** Transfer from some captured properties to child. */
	private initCaptureType(state: ContextState) {
		let parent = this.context.parent
		if (!parent) {
			return
		}

		// Inside a `@effect method(){...}`.
		if (state.effectDecorated) {
			this.captureType = 'both'
		}

		// Broadcast downward capture type within a function-like context.
		else if ((parent.type & ContextTypeMask.FunctionLike) === 0) {
			this.captureType = parent.capturer.captureType
		}
	}

	/** Whether should capture indices in specified type. */
	shouldCapture(type: 'get' | 'set'): boolean {
		if (this.captureType === 'set' && type === 'get') {
			return false
		}
		else {
			return true
		}
	}

	/** Capture an index. */
	capture(index: number, type: 'get' | 'set') {
		this.addCaptureType(type)

		// Remove repetitive item, normally `a.b = c`,
		// `a.b` has been captured as get type, and later set type.
		let repetitiveIndex = this.latestCaptured.indices.find(item => item.index === index)
		if (repetitiveIndex) {
			removeFromList(this.latestCaptured.indices, repetitiveIndex)
		}

		this.latestCaptured.indices.push({index, type})
	}

	/** Whether has captured some indices. */
	hasCaptured(): boolean {
		return this.captured.some(item => item.indices.length > 0)
	}

	/** Every time capture a new index, check type and may toggle capture type. */
	private addCaptureType(type: 'get' | 'set') {
		if (type === 'set' && this.captureType === 'get') {
			let closest = this.context.closestFunctionLike

			// Broadcast downward from closest function-like context, to all get-type descendants.
			let walking = ContextTree.walkInwardChildFirst(closest,
				c => c.closestFunctionLike === closest
					&& c.capturer.captureType === 'get'
			)
			
			for (let descent of walking) {
				descent.capturer.applySetCaptureTypeFromGet()
			}
		}
	}

	/** Apply capture type to `set` from 'get. */
	private applySetCaptureTypeFromGet() {
		this.captureType = 'set'
		this.latestCaptured.indices = []
		this.captured = [this.latestCaptured]
	}

	/** Insert captured indices to specified position. */
	breakCaptured(atIndex: number, flowInterruptedBy: number) {
		// Even no indices captured, still break.
		// Later may append indices to this item.

		// Conditional can't be break, it captures only condition expression.
		if (this.context.type & ContextTypeMask.Conditional) {
			return
		}

		this.latestCaptured.toIndex = atIndex
		this.latestCaptured.flowInterruptedBy = flowInterruptedBy
		this.resetLatestCaptured()
		this.captured.push(this.latestCaptured)
	}

	/** Before each context will exit. */
	beforeExit() {
		this.endCapture()

		// Optimize child-first, then self.
		if ((this.context.type & ContextTypeMask.SourceFile) > 0) {
			for (let descent of this.walkInwardChildFirst()) {
				descent.preProcessCaptured()
			}
		}

		if ((this.context.type & ContextTypeMask.SourceFile) > 0) {
			for (let descent of this.walkInwardSelfFirst()) {
				descent.postProcessCaptured()
			}
		}
	}

	private* walkInwardChildFirst(): Iterable<ContextCapturer> {
		for (let context of ContextTree.walkInwardChildFirst(this.context)) {
			yield context.capturer
		}
	}

	private* walkInwardSelfFirst(): Iterable<ContextCapturer> {
		for (let context of ContextTree.walkInwardSelfFirst(this.context)) {
			yield context.capturer
		}
	}

	/** Prepare latest captured item. */
	private endCapture() {
		let item = this.latestCaptured
		let index = this.context.visitingIndex
		let node = this.context.node

		item.toIndex = index

		// For function declaration, insert to function body.
		if (this.context.type & ContextTypeMask.FunctionLike) {
			let body = (node as TS.FunctionLikeDeclarationBase).body

			// Abstract function or function type declaration has no body.
			if (body) {
				item.toIndex = Visiting.getIndex(body)

				if (ts.isBlock(body)) {
					item.position = InterpolationPosition.Append
				}
				else {
					item.position = InterpolationPosition.After
				}
			}
		}

		// Insert before whole content of target capturer.
		// Normally codes will be moved outward on optimization step.
		// This codes can avoid error occurred even no optimization.
		else if (this.context.type & ContextTypeMask.FlowInterruption
			|| this.context.type & ContextTypeMask.Conditional
		) {
			item.position = InterpolationPosition.Before
		}

		// Can put statements, insert to the end of statements.
		else if (Helper.pack.canPutStatements(node)) {
			item.position = InterpolationPosition.Append
		}

		// Insert to the end.
		else {
			item.position = InterpolationPosition.After
		}
	}

	/** Process current captured, step 1. */
	private preProcessCaptured() {

		// Child-first order is important, checking references step may
		// add more variables, and adjust captured.
		this.checkAccessReferences()

		// Must after reference step, reference step will look for position,
		// which requires indices stay at their context.
		Optimizer.optimize(this.context)
	}

	/** 
	 * Process current captured, step 2.
	 * Previous step may move indices forward or backward.
	 */
	private postProcessCaptured() {
		this.interpolateCaptured()
	}
	
	/** Check captured indices and reference if needs. */
	private checkAccessReferences() {
		for (let item of this.captured) {
			for (let {index} of item.indices) {
				AccessReferences.mayReferenceAccess(index, this.context)
			}
		}
	}


	/** 
	 * Move captured indices to an ancestral, target capturer.
	 * If a node with captured index use local variables and can't be moved, leave it.
	 */
	moveCapturedOutwardTo(toCapturer: ContextCapturer) {
		let indices = this.captured[0].indices
		if (indices.length === 0) {
			return
		}

		let residualIndices = toCapturer.moveCapturedIndicesIn(indices, this)
		this.captured[0].indices = residualIndices
	}

	/** 
	 * Try to move captured indices to self.
	 * `fromCapturer` locates where indices move from.
	 * Returns residual indices that failed to move.
	 */
	moveCapturedIndicesIn(indices: CapturedIndex[], fromCapturer: ContextCapturer): CapturedIndex[] {

		// Locate which captured item should move indices to.
		// Find the first item `toIndex` larger in child-first order..
		let item = this.captured.find(item => {
			return Visiting.isFollowingOfOrEqualInChildFirstOrder(item.toIndex, fromCapturer.context.visitingIndex)
		}) ?? this.latestCaptured

		let fromScope = fromCapturer.context.getDeclarationScope()
		let toScope = this.context.getDeclarationScope()
		let scopesLeaved = Scoping.findWalkingOutwardLeaves(fromScope, toScope)
		let residualIndices: CapturedIndex[] = []

		for (let index of indices) {
			let node = Visiting.getNode(index.index)
			let hashed = Scoping.hashIndex(index.index)

			// `a[i]`, and a is an array, ignore hash of `i`.
			if (ts.isElementAccessExpression(node)
				&& ts.isIdentifier(node.argumentExpression)
				&& Helper.types.isArrayType(Helper.types.getType(node.expression))
			) {
				hashed = Scoping.hashNode(node.expression)
			}

			// Leave contexts contain any referenced variable.
			if (hashed.usedScopes.some(i => scopesLeaved.includes(i))) {
				residualIndices.push(index)
			}
			else {
				item.indices.push(index)
			}
		}

		return residualIndices
	}

	/** Eliminate repetitive captured with an outer hash. */
	eliminateRepetitiveRecursively(hashSet: Set<string>) {
		let ownHashes = new Set(hashSet)
		let startChildIndex = 0

		for (let item of this.captured) {
			for (let index of [...item.indices]) {

				// Has been referenced, ignore always.
				if (AccessReferences.isDescendantAccessReferenced(index.index)) {
					continue
				}

				let hashName = Scoping.hashIndex(index.index).name

				if (ownHashes.has(hashName)) {
					removeFromList(item.indices, index)
				}
				else {
					ownHashes.add(hashName)
				}

				// Has yield like.
				if ((item.flowInterruptedBy & FlowInterruptionTypeMask.YieldLike) > 0) {
					ownHashes.clear()
				}
			}

			// Every time after update hash set,
			// recursively eliminating not processed child contexts in the preceding.
			for (; startChildIndex < this.context.children.length; startChildIndex++) {
				let child = this.context.children[startChildIndex]

				if (!Visiting.isPrecedingOfOrEqual(child.visitingIndex, item.toIndex)) {
					break
				}

				child.capturer.eliminateRepetitiveRecursively(ownHashes)
			}
		}

		// Last captured item may have wrong `toIndex`, here ensure to visit all child contexts.
		for (; startChildIndex < this.context.children.length; startChildIndex++) {
			let child = this.context.children[startChildIndex]
			child.capturer.eliminateRepetitiveRecursively(ownHashes)
		}
	}

	/** Find private class property declaration from captured. */
	*walkPrivateCaptured(ofClass: TS.ClassLikeDeclaration): Iterable<{name: string, index: number, type: 'get' | 'set'}> {
		for (let item of this.captured) {
			for (let {index, type} of item.indices) {
				let node = Visiting.getNode(index) as AccessNode
				let exp = node.expression

				// Must use class instance as access expression.
				let classDecl = Helper.symbol.resolveDeclaration(exp, ts.isClassLike)
				if (classDecl !== ofClass) {
					continue
				}

				let propDecls = Helper.symbol.resolveDeclarations(node, n => {
					return ts.isPropertyDeclaration(n)
						|| ts.isGetAccessorDeclaration(n)
						|| ts.isSetAccessorDeclaration(n)
				})

				if (!propDecls || propDecls.length === 0) {
					continue
				}

				let allBePrivate = propDecls.every(d => {
					return d.modifiers
						&& d.modifiers.find(n => n.kind === ts.SyntaxKind.PrivateKeyword)
					})

				if (!allBePrivate) {
					continue
				}
				
				let name = Helper.access.getNameText(node)

				yield {
					name,
					index,
					type,
				}
			}
		}

		for (let child of this.context.children) {
			yield* child.capturer.walkPrivateCaptured(ofClass)
		}
	}

	/** Remove captured indices recursively. */
	removeCapturedIndices(toRemove: Set<number>) {
		for (let item of this.captured) {
			item.indices = item.indices.filter(index => {
				return !toRemove.has(index.index)
			})
		}

		for (let child of this.context.children) {
			child.capturer.removeCapturedIndices(toRemove)
		}
	}


	/** Add `captured` as interpolation items. */
	private interpolateCaptured() {
		for (let item of this.captured) {
			if (item.indices.length === 0) {
				continue
			}

			this.interpolateCapturedItem(item)
		}
	}

	/** Add each `captured` item. */
	private interpolateCapturedItem(item: CapturedItem) {
		let oldToIndex = item.toIndex
		let newToIndex = this.findBetterInsertPosition(oldToIndex)!
		let indicesInsertToOldPosition: CapturedIndex[] = []
		let indicesInsertToNewPosition: CapturedIndex[] = []

		if (newToIndex !== null) {
			for (let index of item.indices) {
				let hashed = Scoping.hashIndex(index.index)
				let canMove = hashed.usedIndices.every(usedIndex => Visiting.isPrecedingOf(usedIndex, newToIndex))

				if (canMove) {
					indicesInsertToNewPosition.push(index)
				}
				else {
					indicesInsertToOldPosition.push(index)
				}
			}
		}
		else {
			indicesInsertToOldPosition = item.indices
		}

		if (indicesInsertToNewPosition.length > 0) {
			Interpolator.add(newToIndex, {
				position: item.position,
				contentType: InterpolationContentType.Tracking,
				exps: () => this.outputCaptured(indicesInsertToNewPosition),
			})
		}

		if (indicesInsertToOldPosition.length > 0) {
			Interpolator.add(oldToIndex, {
				position: item.position,
				contentType: InterpolationContentType.Tracking,
				exps: () => this.outputCaptured(indicesInsertToOldPosition),
			})
		}

		if (item.indices.some(index => index.type === 'get')) {
			AccessGrouper.addImport('get')
		}

		if (item.indices.some(index => index.type === 'set')) {
			AccessGrouper.addImport('set')
		}
	}

	/** Try to find a better position to insert captured. */
	private findBetterInsertPosition(index: number): number | null {
		let position = ContextTree.findClosestPositionToAddStatements(index, this.context)
		if (!position) {
			return null
		}

		// Must in same context.
		if (position.context !== this.context) {
			return null
		}

		// Same position.
		if (position.index === index) {
			return null
		}

		return position.index
	}

	/** Transfer specified indices to specified position. */
	private outputCaptured(indices: CapturedIndex[]): TS.Expression[] {
		let getIndices = indices.filter(index => index.type === 'get')
		let setIndices = indices.filter(index => index.type === 'set')

		let getExps = getIndices.map(({index}) => {
			let node = Interpolator.outputChildren(index)
			return Helper.pack.extractFinalParenthesized(node)
		}) as AccessNode[]

		let setExps = setIndices.map(({index}) => {
			let node = Interpolator.outputChildren(index)
			return Helper.pack.extractFinalParenthesized(node)
		}) as AccessNode[]

		return [
			...AccessGrouper.makeExpressions(getExps, 'get'),
			...AccessGrouper.makeExpressions(setExps, 'set'),
		]
	}
}