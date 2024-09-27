import {factory, Modifier} from '../../../base'
import {FlowControlBase} from './base'
import {TemplateParser} from '../template'
import {SlotContentType} from '../../../enums'


export class KeyedFlowControl extends FlowControlBase {

	/** $block_0 */
	private blockVariableName: string = ''

	/** $slot_0 */
	private slotVariableName: string = ''

	private contentTemplate: TemplateParser | null = null
	private valueIndex: number = 1

	init() {
		this.blockVariableName = this.tree.getUniqueBlockName()
		this.slotVariableName = this.slot.getSlotName()

		let valueIndex = this.getAttrValueIndex(this.node)
		if (valueIndex === null) {
			throw new Error('<lu:keyed ${...}> must accept a parameter as key!')
		}

		this.valueIndex = valueIndex

		if (this.node.children.length > 0) {
			let template = this.template.separateChildrenAsTemplate(this.node)
			this.contentTemplate = template
		}
	}

	outputInit() {
		Modifier.addImport('KeyedBlock', '@pucelle/lupos.js')

		// let $block_0 = new KeyedBlock / CacheableKeyedBlock(
		//   new TemplateSlot(new SlotPosition(SlotPositionType.Before, nextChild)),
		// )

		let slotContentType = this.contentTemplate ? SlotContentType.TemplateResult : null
		let templateSlot = this.slot.outputTemplateSlot(slotContentType)

		let slotInit = this.slot.createVariableAssignment(
			this.slotVariableName,
			templateSlot
		)

		return [
			slotInit,
			this.slot.createVariableAssignment(
				this.blockVariableName,
				factory.createNewExpression(
					factory.createIdentifier('KeyedBlock'),
					undefined,
					[
						factory.createIdentifier(this.slotVariableName),
					]
				)
			)
		]
	}

	outputUpdate() {
		let keyedValue = this.template.values.outputValue(null, [this.valueIndex])
		let resultValue = this.contentTemplate ? this.contentTemplate.outputReplaced() : null

		// Add it as a value item to original template, and returned it's reference.
		let toResultValue = resultValue
			? this.template.values.outputCustomValue(resultValue)
			: factory.createNull()

		// $block_0.update(newKey, $values[i])
		return factory.createCallExpression(
			factory.createPropertyAccessExpression(
				factory.createIdentifier(this.blockVariableName),
				factory.createIdentifier('update')
			),
			undefined,
			[
				keyedValue,
				toResultValue
			]
		)
	}
}