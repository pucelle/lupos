import type ts from 'typescript'
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
	private contentValueIndex: number | null = null
	private contentTemplate: TemplateParser | null = null
	private keyValueIndex: number | null = null

	override preInit() {
		this.blockVariableName = this.tree.makeUniqueBlockName()
		this.slotVariableName = this.slot.makeSlotName()
		this.normalCacheable = this.hasAttrValue(this.node, 'cache')
		this.weakCacheable = this.hasAttrValue(this.node, 'weakCache')

		let valueIndex = this.getAttrValueIndex(this.node)
		this.keyValueIndex = valueIndex

		if (this.node.children.length > 0) {
			let contentValueIndex = this.getUniqueChildValueIndex(this.node)
			if (contentValueIndex !== null) {
				this.contentValueIndex = contentValueIndex
				
				// Clean children to avoid it get compiled to a new slot.
				this.node.empty()
			}
			else {
				let template = this.template.separateChildrenAsTemplate(this.node)
				this.contentTemplate = template
			}
		}

		let slotContentType = this.contentTemplate ? SlotContentType.TemplateResult : null
		this.templateSlotGetter = this.slot.prepareAsTemplateSlot(slotContentType)
	}

	override outputInit() {
		let blockClassName = this.normalCacheable
			? 'CacheableKeyedBlock'
			: this.weakCacheable
			? 'WeakCacheableKeyedBlock'
			: 'KeyedBlock'

		Modifier.addImport(blockClassName, 'lupos.html')

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

	override outputUpdate() {
		let keyedValueIndices = this.keyValueIndex !== null ? [this.keyValueIndex] : null
		let keyedValue = this.template.values.outputValue(null, keyedValueIndices, this.tree, false, TemplatePartType.FlowControl).joint
		
		let resultValue: ts.Expression | null = null
		
		if (this.contentValueIndex !== null) {
			resultValue = this.template.values.outputValue(null, [this.contentValueIndex], this.tree, false, TemplatePartType.FlowControl).joint
		
		}
		else if (this.contentTemplate) {
			resultValue = this.contentTemplate.outputReplaced()

			// Add it as a custom value into `render()`, and capture it's reference `$values[i]` to output.
			resultValue = resultValue
				? this.slot.outputCustomValue(resultValue)
				: factory.createNull()
		}
		else {
			resultValue = factory.createNull()
		}

		// $block_0.update(newKey, $values[i])
		return factory.createCallExpression(
			factory.createPropertyAccessExpression(
				factory.createIdentifier(this.blockVariableName),
				factory.createIdentifier('update')
			),
			undefined,
			[
				keyedValue,
				resultValue
			]
		)
	}
}