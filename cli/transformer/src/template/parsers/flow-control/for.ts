import type ts from 'typescript'
import {Modifier, transformContext} from '../../../core'
import {FlowControlBase} from './base'
import {SlotContentType} from '../../../enums'
import {ObservedStateMask, ObservedChecker, TrackingPatch} from '../../../lupos'
import {TemplatePartType} from '../../../lupos-ts-module'
import {PartType} from '../tree'


export class ForFlowControl extends FlowControlBase {

	readonly fnAsLazyCallback: boolean = true
	readonly ofAsLazyCallback: boolean = false

	/** $block_0 */
	private blockVariableName: string = ''

	/** $slot_0 */
	private slotVariableName: string = ''

	/** new TemplateSlot(...) */
	private templateSlotGetter!: () => ts.Expression

	private ofValueIndex: number | null = null
	private fnValueIndex: number | null = null

	private ofValueIndexElementsMutable: boolean = false
	private fnValueIndexMutable: boolean = false

	private fnLatestVariableName: string | null = null

	override preInit() {
		this.blockVariableName = this.tree.makeUniqueBlockName()
		this.slotVariableName = this.slot.makeSlotName()
		this.templateSlotGetter = this.slot.prepareAsTemplateSlot(SlotContentType.TemplateResultList)

		let ofValueIndex = this.getAttrValueIndex(this.node)
		let fnValueIndex = this.getUniqueChildValueIndex(this.node)
		let shouldObserve: boolean | null = false

		// Force tracking members of array.
		// When parsing template, all descendant nodes have not been visited by tracking module.
		if (ofValueIndex !== null) {
			let ofValueNode = this.template.values.getRawValue(ofValueIndex)

			shouldObserve = ObservedChecker.getElementsObserved(ofValueNode)
			if (shouldObserve) {
				TrackingPatch.forceTrackType(ofValueNode, ObservedStateMask.Elements)
				TrackingPatch.addCustomTracking(ofValueNode, 'get', ofValueNode, '')
			}
		}

		if (fnValueIndex !== null) {
			let fnValueNode = this.template.values.getRawValue(fnValueIndex)

			if (transformContext.helper.isFunctionLike(fnValueNode)) {

				// Force broadcasting observed from list to item.
				let firstParameter = fnValueNode.parameters[0]
				if (firstParameter) {
					if (shouldObserve) {
						TrackingPatch.forceTrackType(firstParameter, ObservedStateMask.Elements)
					}
				}

				// For tracking optimization.
				TrackingPatch.forceInstantlyRun(fnValueNode)
			}
		}

		this.ofValueIndex = ofValueIndex
		this.fnValueIndex = fnValueIndex

		this.ofValueIndexElementsMutable = ofValueIndex !== null
			&& (
				!this.template.values.isIndexCanTransfer(ofValueIndex, this.ofAsLazyCallback)

				// E.g., `<lu:for ${aReadonlyProperty}>`, it must get updated every time.
				|| this.template.values.isElementsPartMutable(ofValueIndex)
		)

		this.fnValueIndexMutable = fnValueIndex !== null
			&& !this.template.values.isIndexCanTransfer(fnValueIndex, this.fnAsLazyCallback)

		if (this.fnValueIndexMutable) {
			this.fnLatestVariableName = this.tree.makeUniqueLatestName()
		}

		// Remove child slot.
		this.node.empty()

		// `ForBlock` can track data.
		this.tree.addPart(this.blockVariableName, this.node, PartType.Block)
	}

	private outputFnUpdate() {
		let fnValueIndices = this.fnValueIndex !== null ? [this.fnValueIndex] : null
		let value = this.template.values.outputValue(null, fnValueIndices, this.tree, this.fnAsLazyCallback, TemplatePartType.FlowControl)

		// if ($latest_0 !== $values[0]) {
		//   $block_0.updateRenderFn($values[0])
		//   $latest_0 = $values[0]
		// }
		if (this.fnLatestVariableName) {
			return transformContext.factory.createIfStatement(
				this.slot.outputLatestComparison([this.fnLatestVariableName], value.valueNodes),
				transformContext.factory.createBlock(
					[
						transformContext.factory.createExpressionStatement(transformContext.factory.createCallExpression(
							transformContext.factory.createPropertyAccessExpression(
								transformContext.factory.createIdentifier(this.blockVariableName),
								transformContext.factory.createIdentifier('updateRenderFn')
							),
							undefined,
							[
								value.joint
							]
						)),
						...this.slot.outputLatestAssignments([this.fnLatestVariableName], value.valueNodes),
					],
					true
				),
				undefined
			)
		}
		else {

			// $block_0.updateRenderFn(data)
			return transformContext.factory.createCallExpression(
				transformContext.factory.createPropertyAccessExpression(
					transformContext.factory.createIdentifier(this.blockVariableName),
					transformContext.factory.createIdentifier('updateRenderFn')
				),
				undefined,
				[
					value.joint,
				]
			)
		}
	}

	private outputOfUpdate() {
		let ofValueIndices = this.ofValueIndex !== null ? [this.ofValueIndex] : null
		let value = this.template.values.outputValue(null, ofValueIndices, this.tree, this.ofAsLazyCallback, TemplatePartType.FlowControl)

		// Not compare, update directly.
		// $block_0.updateData(data)
		return transformContext.factory.createCallExpression(
			transformContext.factory.createPropertyAccessExpression(
				transformContext.factory.createIdentifier(this.blockVariableName),
				transformContext.factory.createIdentifier('updateData')
			),
			undefined,
			[
				value.joint,
			]
		)
	}

	override outputInit() {
		Modifier.addImport('ForBlock', 'lupos.html')

		// let $block_0 = new ForBlock(
		//   new TemplateSlot(new SlotPosition(SlotPositionType.Before, nextChild)),
		//   $context_0,
		// )

		let templateSlot = this.templateSlotGetter()

		let slotInit = this.slot.createVariableAssignment(
			this.slotVariableName,
			templateSlot
		)

		let forBlockInit = this.slot.createVariableAssignment(
			this.blockVariableName,
			transformContext.factory.createNewExpression(
				transformContext.factory.createIdentifier('ForBlock'),
				undefined,
				[
					transformContext.factory.createIdentifier(this.slotVariableName),
				]
			)
		)

		return [
			slotInit,
			forBlockInit,
			...this.fnValueIndexMutable ? [] : [this.outputFnUpdate()],
			...this.ofValueIndexElementsMutable ? [] : [this.outputOfUpdate()],
		]
	}

	override outputUpdate() {
		return [
			...this.fnValueIndexMutable ? [this.outputFnUpdate()] : [],
			...this.ofValueIndexElementsMutable ? [this.outputOfUpdate()] : [],
		]
	}
}