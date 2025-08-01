import type * as ts from 'typescript'
import {factory, Modifier} from '../../../core'
import {FlowControlBase} from './base'
import {TemplateParser} from '../template'
import {SlotContentType} from '../../../enums'
import {TemplatePartType} from '../../../lupos-ts-module'


export class KeyedFlowControl extends FlowControlBase {

	/** $block_0 */
	private blockVariableName: string = ''

	/** $slot_0 */
	private slotVariableName: string = ''

	/** new TemplateSlot(...) */
	private templateSlotGetter!: () => ts.Expression

	protected normalCacheable: boolean = false
	protected weakCacheable: boolean = false
	private contentTemplate: TemplateParser | null = null
	private valueIndex: number | null = null

	preInit() {
		this.blockVariableName = this.tree.makeUniqueBlockName()
		this.slotVariableName = this.slot.makeSlotName()
		this.normalCacheable = this.hasAttrValue(this.node, 'cache')
		this.weakCacheable = this.hasAttrValue(this.node, 'weakCache')

		let valueIndex = this.getAttrValueIndex(this.node)
		this.valueIndex = valueIndex

		if (this.node.children.length > 0) {
			let template = this.template.separateChildrenAsTemplate(this.node)
			this.contentTemplate = template
		}

		let slotContentType = this.contentTemplate ? SlotContentType.TemplateResult : null
		this.templateSlotGetter = this.slot.prepareAsTemplateSlot(slotContentType)
	}

	outputInit() {
		let blockClassName = this.normalCacheable
			? 'CacheableKeyedBlock'
			: this.weakCacheable
			? 'WeakCacheableKeyedBlock'
			: 'KeyedBlock'

		Modifier.addImport(blockClassName, '@pucelle/lupos.js')

		// let $block_0 = new KeyedBlock(
		//   new TemplateSlot(new SlotPosition(SlotPositionType.Before, nextChild)),
		// )
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
					factory.createIdentifier(blockClassName),
					undefined,
					[
						factory.createIdentifier(this.slotVariableName),
					]
				)
			)
		]
	}

	outputUpdate() {
		let keyedValueIndices = this.valueIndex !== null ? [this.valueIndex] : null
		let keyedValue = this.template.values.outputValue(null, keyedValueIndices, this.tree, this.asLazyCallback, TemplatePartType.FlowControl).joint
		let resultValue = this.contentTemplate ? this.contentTemplate.outputReplaced() : null

		// Add it as a value item to original template, and returned it's reference.
		let toResultValue = resultValue
			? this.slot.outputCustomValue(resultValue)
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