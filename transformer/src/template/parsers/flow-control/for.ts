import type * as ts from 'typescript'
import {factory, Modifier} from '../../../core'
import {Helper} from '../../../lupos-ts-module'
import {FlowControlBase} from './base'
import {SlotContentType} from '../../../enums'
import {ForceTrackType, ObservedChecker, TrackingPatch} from '../../../ff'


export class ForFlowControl extends FlowControlBase {

	/** $block_0 */
	private blockVariableName: string = ''

	/** $slot_0 */
	private slotVariableName: string = ''

	/** new TemplateSlot(...) */
	private templateSlotGetter!: () => ts.Expression

	private ofValueIndex: number | null = null
	private fnValueIndex: number | null = null

	private ofValueIndexMutableAndCantTurn: boolean = false
	private fnValueIndexMutableAndCantTurn: boolean = false

	private fnLatestVariableName: string | null = null

	preInit() {
		this.blockVariableName = this.tree.makeUniqueBlockName()
		this.slotVariableName = this.slot.makeSlotName()
		this.templateSlotGetter = this.slot.prepareTemplateSlot(SlotContentType.TemplateResultList)

		let ofValueIndex = this.getAttrValueIndex(this.node)
		let fnValueIndex = this.getUniqueChildValueIndex(this.node)
		let shouldObserveElements = false

		if (ofValueIndex === null) {
			this.slot.diagnoseNormal('<lu:for ${...}> must accept a parameter as loop data!')
		}

		// Force tracking members of array.
		else {
			let ofValueNode = this.template.values.getRawValue(ofValueIndex)

			shouldObserveElements = ObservedChecker.isObserved(ofValueNode, true)
			if (shouldObserveElements) {
				TrackingPatch.forceTrack(ofValueNode, ForceTrackType.Elements)
			}
		}

		if (fnValueIndex === null) {
			this.slot.diagnoseNormal('<lu:for>${...}</> must accept a parameter as child item renderer!')
		}
		else {
			let fnValueNode = this.template.values.getRawValue(fnValueIndex)

			if (Helper.isFunctionLike(fnValueNode)) {
				let firstParameter = fnValueNode.parameters[0]
				if (firstParameter) {
					if (shouldObserveElements) {
						TrackingPatch.forceTrack(firstParameter, ForceTrackType.Self)
					}
				}
			}
		}

		this.ofValueIndex = ofValueIndex
		this.fnValueIndex = fnValueIndex

		this.ofValueIndexMutableAndCantTurn = ofValueIndex !== null
			&& this.template.values.isIndexMutable(ofValueIndex)
			&& !this.template.values.isIndexCanTurnStatic(ofValueIndex)

		this.fnValueIndexMutableAndCantTurn = fnValueIndex !== null
			&& this.template.values.isIndexMutable(fnValueIndex)
			&& !this.template.values.isIndexCanTurnStatic(fnValueIndex)

		if (this.fnValueIndexMutableAndCantTurn) {
			this.fnLatestVariableName = this.tree.makeUniqueLatestName()
		}

		// Remove child slot.
		this.node.empty()
	}

	private outputFnUpdate() {
		let fnValueIndices = this.fnValueIndex !== null ? [this.fnValueIndex] : null
		let value = this.template.values.outputValue(null, fnValueIndices)

		// if ($latest_0 !== $values[0]) {
		//   $block_0.updateRenderFn($values[0])
		//   $latest_0 = $values[0]
		// }
		if (this.fnLatestVariableName) {
			return factory.createIfStatement(
				this.slot.outputLatestComparison([this.fnLatestVariableName], value.valueNodes),
				factory.createBlock(
					[
						factory.createExpressionStatement(factory.createCallExpression(
							factory.createPropertyAccessExpression(
								factory.createIdentifier(this.blockVariableName),
								factory.createIdentifier('updateRenderFn')
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
			return factory.createCallExpression(
				factory.createPropertyAccessExpression(
					factory.createIdentifier(this.blockVariableName),
					factory.createIdentifier('updateRenderFn')
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
		let value = this.template.values.outputValue(null, ofValueIndices)

		// Not compare, update directly.
		// $block_0.updateData(data)
		return factory.createCallExpression(
			factory.createPropertyAccessExpression(
				factory.createIdentifier(this.blockVariableName),
				factory.createIdentifier('updateData')
			),
			undefined,
			[
				value.joint,
			]
		)
	}

	outputInit() {
		Modifier.addImport('ForBlock', '@pucelle/lupos.js')

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
			factory.createNewExpression(
				factory.createIdentifier('ForBlock'),
				undefined,
				[
					factory.createIdentifier(this.slotVariableName),
				]
			)
		)

		return [
			slotInit,
			forBlockInit,
			...this.fnValueIndexMutableAndCantTurn ? [] : [this.outputFnUpdate()],
			...this.ofValueIndexMutableAndCantTurn ? [] : [this.outputOfUpdate()],
		]
	}

	outputUpdate() {
		return [
			...this.fnValueIndexMutableAndCantTurn ? [this.outputFnUpdate()] : [],
			...this.ofValueIndexMutableAndCantTurn ? [this.outputOfUpdate()] : [],
		]
	}
}