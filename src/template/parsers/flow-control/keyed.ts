import {factory, Modifier} from '../../../base'
import {FlowControlBase} from './base'
import {VariableNames} from '../variable-names'


export class KeyedFlowControl extends FlowControlBase {

	/** $block_0 */
	private blockVariableName: string = ''

	/** $slot_0 */
	private slotVariableName: string = ''

	private cacheable: boolean = false
	private templateName: string | null = null
	private valueIndex: number = 1

	init() {
		this.blockVariableName = this.tree.getUniqueBlockName()
		this.slotVariableName = this.slot.getSlotName()
		this.cacheable = this.hasAttrValue(this.node, 'cache')

		let valueIndex = this.getAttrValueIndex(this.node)
		if (valueIndex === null) {
			throw new Error('<lu:keyed ${...}> must accept a parameter as key!')
		}

		this.valueIndex = valueIndex

		if (this.node.children.length > 0) {
			let tree = this.tree.separateChildrenAsSubTree(this.node)
			this.templateName = tree.getTemplateRefName()
		}
	}

	outputInit() {
		let blockClassName = this.cacheable ? 'CacheableKeyedBlock' : 'KeyedBlock'
		Modifier.addImport(blockClassName, '@pucelle/lupos.js')

		// let $block_0 = new KeyedBlock / CacheableKeyedBlock(
		//   maker,
		//   new TemplateSlot(new SlotPosition(SlotPositionType.Before, nextChild)),
		//   $context_0,
		// )

		let maker = this.outputMakerNode(this.templateName)
		let templateSlot = this.slot.outputTemplateSlot(null)

		let slotInit = this.slot.createVariableAssignment(
			this.slotVariableName,
			templateSlot
		)

		return [
			slotInit,
			this.slot.createVariableAssignment(
				this.blockVariableName,
				factory.createNewExpression(
					factory.createIdentifier(blockClassName),
					undefined,
					[
						maker,
						factory.createIdentifier(this.slotVariableName),
					]
				)
			)
		]
	}

	outputUpdate() {
		let keyedNode = this.template.values.outputValue(null, [this.valueIndex])

		// $block_0.update(newKey, $values)
		return factory.createCallExpression(
			factory.createPropertyAccessExpression(
				factory.createIdentifier(this.blockVariableName),
				factory.createIdentifier('update')
			),
			undefined,
			[
				keyedNode,
				factory.createIdentifier(VariableNames.values)
			]
		)
	}
}