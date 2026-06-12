import type * as ts from 'typescript'
import {factory, Modifier} from '../../../core'
import {FlowControlBase} from './base'
import {TemplateParser} from '../template'
import {SlotContentType} from '../../../enums'


export class CacheFlowControl extends FlowControlBase {

	/** $block_0 */
	private blockVariableName: string = ''

	/** $slot_0 */
	private slotVariableName: string = ''

	/** new TemplateSlot(...) */
	private templateSlotGetter!: () => ts.Expression

	private contentTemplate: TemplateParser | null = null

	override preInit() {
		this.blockVariableName = this.tree.makeUniqueBlockName()
		this.slotVariableName = this.slot.makeSlotName()

		if (this.node.children.length > 0) {
			let template = this.template.separateChildrenAsTemplate(this.node)
			this.contentTemplate = template
		}

		let slotContentType = this.contentTemplate ? SlotContentType.TemplateResult : null
		this.templateSlotGetter = this.slot.prepareAsTemplateSlot(slotContentType)
	}

	override outputInit() {
		let blockClassName = 'CacheBlock'
		Modifier.addImport(blockClassName, 'lupos.html')

		// let $block_0 = new CacheBlock(
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
				toResultValue
			]
		)
	}
}