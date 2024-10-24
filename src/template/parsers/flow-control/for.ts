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
			TrackingPatch.forceTrack(ofValueNodeIndex, ForceTrackType.Members)
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
					TrackingPatch.forceTrack(firstParameterIndex, ForceTrackType.Self)
				}
			}
		}

		this.ofValueIndex = ofValueIndex
		this.fnValueIndex = fnValueIndex

		// Remove child slot.
		this.node.empty()
	}

	outputInit() {
		Modifier.addImport('ForBlock', '@pucelle/lupos.js')

		// let $block_0 = new ForBlock(
		//   renderFn,
		//   new TemplateSlot(new SlotPosition(SlotPositionType.Before, nextChild)),
		//   $context_0,
		// )

		// Force render fn to be static.
		// So this render fn can't be like `a ? this.render1` : `this.render2`.
		let fnValueIndices = this.fnValueIndex !== null ? [this.fnValueIndex] : null
		let renderFnNode = this.template.values.outputValue(null, fnValueIndices, true).joint as TS.FunctionExpression
		
		let templateSlot = this.templateSlotGetter()

		let slotInit = this.slot.createVariableAssignment(
			this.slotVariableName,
			templateSlot
		)

		return [
			slotInit,
			this.slot.createVariableAssignment(
				this.blockVariableName,
				factory.createNewExpression(
					factory.createIdentifier('ForBlock'),
					undefined,
					[
						renderFnNode,
						factory.createIdentifier(this.slotVariableName),
					]
				)
			)
		]
	}

	outputUpdate() {
		let ofValueIndices = this.ofValueIndex !== null ? [this.ofValueIndex] : null
		let ofNode = this.template.values.outputValue(null, ofValueIndices).joint

		// $block_0.update(data)
		// may be data is static, will still update each time
		return factory.createCallExpression(
			factory.createPropertyAccessExpression(
				factory.createIdentifier(this.blockVariableName),
				factory.createIdentifier('update')
			),
			undefined,
			[
				ofNode,
			]
		)
	}
}