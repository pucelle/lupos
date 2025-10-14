import * as ts from 'typescript'
import {Modifier, helper} from '../../core'
import {TrackingArea} from './area'
import {TrackingAreaTree, TrackingAreaTypeMask} from './area-tree'
import {CapturedHashMap} from './captured-hashing'
import {TrackingPatch} from './patch'


/**
 * 0. Should find a way to hash access expression.
 * 1. If parent area has a captured, child areas should eliminate it.
 * 2. If all conditional areas have same captured, move it higher.
 * 3. Try to move captured from iteration area higher.
 * 4. If previous captured has a captured, should eliminate it from following captured.
 */
export namespace Optimizer {

	/** 
	 * Optimize each area before it will exit.
	 * All child areas must have been optimized.
	 */
	export function optimize(area: TrackingArea) {

		// `return a.b` -> `track(a.b); return ...`
		if (area.type & TrackingAreaTypeMask.FlowInterruption) {
			moveFlowInterruptionCapturedOutward(area)
		}

		// `if (...) {a.b} else {a.b}` -> `track(a.b); if ...`
		if (area.type & TrackingAreaTypeMask.Conditional) {
			mergeConditionalContentCapturedBranches(area)
		}

		// `if (a.b) ...`-> `track(a.b); if ...`
		if (area.type & TrackingAreaTypeMask.ConditionalCondition
			|| area.type & TrackingAreaTypeMask.SwitchCondition
		) {
			moveAnyConditionCapturedOutward(area)
		}

		// `if (a.b && a.c) {a.c}` -> Remove `track(a.c)` from content.`
		if (area.type & TrackingAreaTypeMask.ConditionalContent) {
			eliminateRepetitiveFromContentByCondition(area)
		}

		// `case a.b: ... case a.b + 1: ...` -> `track(a.b); ...`
		// `if (a.b) ...`-> `track(a.b); if ...`
		if (area.type & TrackingAreaTypeMask.Switch) {
			moveCaseConditionCapturedBranchesOutward(area)
			mergeCaseContentCapturedBranches(area)
		}

		// `for(let c = a.b;)` -> `track(a.b); for ...`.
		if (area.type & TrackingAreaTypeMask.IterationInitializer) {
			moveIterationInitializerCapturedOutward(area)
		}

		// `for (let c = 0; c < a.b; )` -> `track(a.b); for...`
		// `for (let a = xx; a.b; )` -> `for (...) {track(a.b); ...}`
		if (area.type & TrackingAreaTypeMask.IterationCondition
			|| area.type & TrackingAreaTypeMask.IterationIncreasement
			|| area.type & TrackingAreaTypeMask.IterationExpression
		) {
			moveIterationConditionIncreasementCapturedOutward(area)
			moveIterationConditionIncreasementCapturedToIterationContent(area)
		}

		// This optimizing has low risk, loop codes may not run when do 0 loop.
		// Must after `moveIterationConditionIncreasementCapturedToIterationContent` step.
		// `for (...) {a.b}` -> `track(a.b); for ...
		// `for (let i; ...) {a[i]}` -> `for (...) {}; track(a, '');`
		if (area.type & TrackingAreaTypeMask.IterationContent) {
			moveIterationContentCapturedOutward(area)
			moveIterationContentDynamicIndexCapturedOutward(area)
		}

		// This optimizing has low risk, array methods may not run when have no items.
		// `[].map(i => {i + a.b})` -> `track(a.b); [].map...`
		if (area.type & TrackingAreaTypeMask.InstantlyRunFunction) {
			moveInstantlyRunFunctionCapturedOutward(area)
		}

		// Eliminate repetitive.
		// `track(a.b); if (...) {track(a.b)}` -> `track(a.b); if (...) {}`
		if (area.type & TrackingAreaTypeMask.FunctionLike) {
			eliminateRepetitiveCapturedRecursively(area)
		}

		// Eliminate private and don't have both get and set capture types.
		// `class {private prop}`, has only `prop` getting, or only setting -> remove it.
		if (area.type & TrackingAreaTypeMask.Class) {
			eliminatePrivateUniqueTrackingType(area)
		}
	}


	/** 
	 * Move flow interruption captured outward.
	 * `return a.b` -> `track(a.b); return ...`
	 */
	function moveFlowInterruptionCapturedOutward(area: TrackingArea) {
		if (!area.capturer.hasCaptured()) {
			return
		}

		// Can't across conditional content.
		if (area.type & TrackingAreaTypeMask.ConditionalContent) {
			return
		}

		// parent of flow interruption.
		let targetArea = area.parent!

		area.capturer.operator.safelyMoveCapturedOutwardTo(targetArea.capturer)
	}


	/** 
	 * Move condition of conditional or switch captured outward.
	 * `if (a.b) ...`-> `track(a.b); if ...`
	 * `switch (a.b) ...`-> `track(a.b); switch ...`
	 */
	function moveAnyConditionCapturedOutward(area: TrackingArea) {
		if (!area.capturer.hasCaptured()) {
			return
		}

		// `a && b && c`, ancestor's types of `a`:
		// ConditionalCondition =>
		// Conditional & ConditionalCondition =>
		// Conditional

		// Look for the end of `ConditionalCondition` chain.
		let conditionArea = area
		while (conditionArea.parent!.type & TrackingAreaTypeMask.ConditionalCondition) {
			conditionArea = conditionArea.parent!
		}

		// parent of conditional or switch.
		let targetArea = conditionArea.parent!.parent!

		// Can't across `ConditionalContent`, so move to Conditional.
		if (conditionArea.parent!.type & TrackingAreaTypeMask.ConditionalContent) {
			targetArea = conditionArea.parent!
		}

		area.capturer.operator.safelyMoveCapturedOutwardTo(targetArea.capturer)
	}


	/** 
	 * Eliminate capture from conditional content, when repetitive with binary and right part.
	 * `if (a.b && a.c) {a.c}` -> Remove `track(a.c)` from content.
	 */
	function eliminateRepetitiveFromContentByCondition(area: TrackingArea) {
		let condition = area.parent!.children.find(s => s.type & TrackingAreaTypeMask.ConditionalCondition)
		let content = area

		if (!condition || !content) {
			return
		}
	
		let mustRunParts = [...walkForMustRunParts(condition)]
		if (mustRunParts.length === 0) {
			return
		}

		let conditionHashMap = CapturedHashMap.fromCapturersUnion(mustRunParts.map(part => part.capturer))
		content.capturer.operator.eliminateRepetitiveRecursively(conditionHashMap)
	}

	/** Walk for partial areas that must run. */
	function *walkForMustRunParts(area: TrackingArea): Iterable<TrackingArea> {
		if (area.type & TrackingAreaTypeMask.CaseDefaultContent) {
			return
		}

		yield area

		if (area.type & TrackingAreaTypeMask.Conditional) {

			// Both parts of `a && b`.
			if (ts.isBinaryExpression(area.node)
				&& area.node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
			) {
				for (let child of area.children) {
					yield* walkForMustRunParts(child)
				}
			}

			// Left parts of `a && b`, or `a ? b : c`.
			else {
				let condition = area.children.find(s => s.type & TrackingAreaTypeMask.ConditionalCondition)
				if (condition) {
					yield *walkForMustRunParts(condition)
				}
			}
		}
	}


	/** 
	 * Merge all branches captured and move outward.
	 * `if (...) {a.b} else {a.b}` -> `track(a.b); if ...`
	 */
	function mergeConditionalContentCapturedBranches(area: TrackingArea) {
		let contentChildren = area.children.filter(child => {
			return child.type & TrackingAreaTypeMask.ConditionalContent
		})

		// Must have both two branches, and each have some captured.
		let canMerge = contentChildren.length >= 2 && contentChildren.every(child => child.capturer.hasCaptured())
		if (!canMerge) {
			return
		}

		let capturers = contentChildren.map(c => c.capturer)
		if (capturers.length === 0) {
			return
		}

		let sharedMap = CapturedHashMap.fromCapturersIntersection(capturers)
		
		// parent of conditional or switch.
		let targetArea = area.parent!

		// Can't across `ConditionalContent`, move to Conditional.
		if (area.type & TrackingAreaTypeMask.ConditionalContent) {
			targetArea = area
		}

		contentChildren[0].capturer.operator.safelyMoveCapturedItemsOutwardTo(sharedMap.items(), targetArea.capturer)
	}


	/** 
	 * Move all case condition captured to outward.
	 * `case a.b: ... case a.c: ...` -> `track(a.b, a.c); ...`
	 */
	function moveCaseConditionCapturedBranchesOutward(area: TrackingArea) {
		let caseConditionChildren = area.children.map(child => child.children).flat().filter(child => {
			return child.type & TrackingAreaTypeMask.CaseCondition
		})

		let capturers = caseConditionChildren.map(c => c.capturer)
		let targetArea = area.parent!

		for (let capturer of capturers) {
			capturer.operator.safelyMoveCapturedOutwardTo(targetArea.capturer)
		}
	}


	/** 
	 * Merge all case content captured and move outward.
	 * `case xxx: a.b; case xxx: a.b` -> `track(a.b); ...`
	 */
	function mergeCaseContentCapturedBranches(area: TrackingArea) {
		let caseContentChildren = area.children.map(child => child.children).flat().filter(child => {
			return child.type & TrackingAreaTypeMask.CaseDefaultContent
		})

		let capturers = caseContentChildren.map(c => c.capturer)
		if (capturers.length === 0) {
			return
		}

		let sharedMap = CapturedHashMap.fromCapturersIntersection(capturers)

		let targetArea = area.parent!
		caseContentChildren[0].capturer.operator.safelyMoveCapturedItemsOutwardTo(sharedMap.items(), targetArea.capturer)
	}


	/** 
	 * Move whole content of iteration initializer outward.
	 * `for(let c = a.b;)` -> `track(a.b); for ...`.
	 */
	function moveIterationInitializerCapturedOutward(area: TrackingArea) {
		if (!area.capturer.hasCaptured()) {
			return
		}

		let toPosition = TrackingAreaTree.findClosestPositionToAddStatements(
			area.node, area
		)

		Modifier.moveOnce(area.node, toPosition.toNode)
		area.capturer.operator.safelyMoveCapturedOutwardTo(toPosition.area.capturer)
	}


	/** Move iteration condition or increasement or expression captured outward. */
	function moveIterationConditionIncreasementCapturedOutward(area: TrackingArea) {
		if (!area.capturer.hasCaptured()) {
			return
		}

		// parent of iteration.
		let targetArea = area.parent!.parent!

		area.capturer.operator.safelyMoveCapturedOutwardTo(targetArea.capturer)
	}


	/** 
	 * Move iteration condition or increasement or expression captured inward to iteration content.
	 * `for (let a = xx; a.b; )` -> `for (...) {track(a.b); ...}`
	 */
	function moveIterationConditionIncreasementCapturedToIterationContent(area: TrackingArea) {
		if (!area.capturer.hasCaptured()) {
			return
		}

		// Iteration Content.
		let targetArea = area.parent!.children.find(c => c.type & TrackingAreaTypeMask.IterationContent)
		if (targetArea) {
			area.capturer.operator.moveCapturedTo(targetArea.capturer)
		}
	}


	/** 
	 * Move iteration captured outward.
	 * `for (...) {a.b}` -> `for (...) {}; track(a.b);`
	 */
	function moveIterationContentCapturedOutward(area: TrackingArea) {
		if (!area.capturer.hasCaptured()) {
			return
		}

		// parent of iteration.
		let targetArea = area.parent!.parent!

		area.capturer.operator.safelyMoveCapturedOutwardTo(targetArea.capturer)
	}


	/** 
	 * Move iteration captured which uses dynamic index declared in for statement outward.
	 * `for (let i; ...) {a[i]}` -> `for (...) {}; track(a, '');`
	 */
	function moveIterationContentDynamicIndexCapturedOutward(area: TrackingArea) {
		if (!area.capturer.hasCaptured()) {
			return
		}

		// parent of iteration.
		let targetArea = area.parent!.parent!

		area.capturer.operator.moveDynamicIndexedCapturedOutward(targetArea.capturer)
	}


	/** 
	 * Move instantly run function like array methods captured outward.
	 * `[].map(i => {i + a.b})` -> `track(a.b); [].map...`
	 */
	function moveInstantlyRunFunctionCapturedOutward(area: TrackingArea) {
		if (!area.capturer.hasCaptured()) {
			return
		}

		// parent of array method.
		let targetArea = area.parent!

		area.capturer.operator.safelyMoveCapturedOutwardTo(targetArea.capturer)
	}


	/** 
	 * Eliminate repetitive captured items that repeat itself or with it's descendants.
	 * `track(a.b); if (...) {track(a.b)}` -> `track(a.b); if (...) {}`
	 */
	function eliminateRepetitiveCapturedRecursively(area: TrackingArea) {
		area.capturer.operator.eliminateRepetitiveRecursively(new CapturedHashMap())
	}


	/** 
	 * Eliminate private and don't have both get and set capture types.
	 * `class {private prop}`, has only `prop` getting, or only setting -> remove it.
	 */
	function eliminatePrivateUniqueTrackingType(area: TrackingArea) {
		enum TypeMask {
			Get = 1,
			Set = 2,
		}

		let classNode = area.node as ts.ClassLikeDeclaration
		let keyMap: Map<string, {nodes: ts.Node[], typeMask: TypeMask | 0}> = new Map()

		// All captured items, include those within current area, and force tracked.
		let allCapturedItems = [...area.capturer.walkCapturedRecursively()].filter(item => !TrackingPatch.hasIgnored(item.node))

		// Custom items should be do filtering by `hasIgnored`, see `ref`.
		allCapturedItems.push(...TrackingPatch.walkCustomTrackingItems())

		// Group captured by property name.
		for (let capturedItem of allCapturedItems) {
			let privateItem = area.capturer.operator.getPrivatePropertyCaptured(capturedItem, classNode)
			if (!privateItem) {
				continue
			}

			let {key, node, type} = privateItem
			let item = keyMap.get(key)
			if (!item) {
				item = {
					nodes: [],
					typeMask: 0,
				}

				keyMap.set(key, item)
			}
                                                                                                                                                                                                                                                                                                                                                                                                                                                     
			item.nodes.push(node)
			item.typeMask |= (type === 'get' ? TypeMask.Get : TypeMask.Set)
		}

		// Visit all private computed, treat it as set type.
		for (let member of classNode.members) {
			if (!ts.isGetAccessorDeclaration(member)) {
				continue
			}

			let name = helper.getText(member.name)
			let nameMapItem = keyMap.get(name)
			if (!nameMapItem) {
				continue
			}

			let decorators = helper.deco.getDecorators(member)
			let computed = decorators.find(deco => helper.deco.getName(deco) === 'computed')
			if (!computed) {
				continue
			}

			nameMapItem.typeMask |= TypeMask.Set
		}


		// Generate nodes that should be removed.
		let removeNodes: Set<ts.Node> = new Set()

		for (let {nodes, typeMask} of keyMap.values()) {
			if (typeMask === (TypeMask.Get | TypeMask.Set)) {
				continue
			}

			for (let node of nodes) {
				removeNodes.add(node)
			}
		}

		area.capturer.operator.removeCapturedRecursively(removeNodes)
	}
}