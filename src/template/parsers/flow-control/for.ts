import type TS from 'typescript'
import {factory, Helper, Modifier, VisitTree} from '../../../base'
import {FlowControlBase} from './base'
import {SlotContentType} from '../../../enums'
import {ForceTrackType, TrackingPatch} from '../../../ff'


export class ForFlowControl extends FlowControlBase {

	/** $block_0 */
	private blockVariableName: string = ''

	/** $slot_0 */
	private slotVariableName: string = ''

	/** new TemplateSlot(...) */
	private templateSlotGetter!: () => TS.Expression

	private ofValueIndex: number | null = null
	private fnValueIndex: number | null = null

	private ofValueIndexMutableAndCantTurn: boolean = false
	private fnValueIndexMutableAndCantTurn: boolean = false

	private ofLatestVariableName: string | null = null
	private fnLatestVariableName: string | null = null

	preInit() {
		this.blockVariableName = this.tree.makeUniqueBlockName()
		this.slotVariableName = this.slot.makeSlotName()
		this.templateSlotGetter = this.slot.prepareTemplateSlot(SlotContentType.TemplateResultList)

		let ofValueIndex = this.getAttrValueIndex(this.node)
		let fnValueIndex = this.getUniqueChildValueIndex(this.node)

		if (ofValueIndex === null) {
			this.slot.diagnoseNormal('<lu:for ${...}> must accept a parameter as loop data!')
		}

		// Force tracking members of array.
		else {
			let ofValueNode = this.template.values.getRawValue(ofValueIndex)
			let ofValueNodeIndex = VisitTree.getIndex(ofValueNode)
			TrackingPatch.forceRecheck(ofValueNodeIndex, ForceTrackType.Members)
		}

		if (fnValueIndex === null) {
			this.slot.diagnoseNormal('<lu:for>${...}</> must accept a parameter as child item renderer!')
		}
		else {
			let fnValueNode = this.template.values.getRawValue(fnValueIndex)

			if (Helper.isFunctionLike(fnValueNode)) {
				let firstParameter = fnValueNode.parameters[0]
				if (firstParameter) {
					let firstParameterIndex = VisitTree.getIndex(firstParameter)
					TrackingPatch.forceRecheck(firstParameterIndex, ForceTrackType.Self)
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

		if (this.ofValueIndexMutableAndCantTurn) {
			this.ofLatestVariableName = this.tree.makeUniqueLatestName()
		}

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
								factory.createIdentifier('updateRenderFnRenderFn')
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

		// if ($latest_0 !== $values[0]) {
		//   $block_0.updateData($values[0])
		//   $latest_0 = $values[0]
		// }
		if (this.ofLatestVariableName) {
			return factory.createIfStatement(
				this.slot.outputLatestComparison([this.ofLatestVariableName], value.valueNodes),
				factory.createBlock(
					[
						factory.createExpressionStatement(factory.createCallExpression(
							factory.createPropertyAccessExpression(
								factory.createIdentifier(this.blockVariableName),
								factory.createIdentifier('updateData')
							),
							undefined,
							[
								value.joint
							]
						)),
						...this.slot.outputLatestAssignments([this.ofLatestVariableName], value.valueNodes),
					],
					true
				),
				undefined
			)
		}
		else {

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

		return [
			slotInit,
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