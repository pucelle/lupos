import type TS from 'typescript'
import {factory, Helper, Modifier} from '../../../base'
import {FlowControlBase} from './base'
import {TemplateParser} from '../template'
import {SlotContentType} from '../../../enums'


export class IfFlowControl extends FlowControlBase {

	/** $block_0 */
	private blockVariableName: string = ''

	/** $slot_0 */
	private slotVariableName: string = ''

	private cacheable: boolean = false
	private valueIndices: (number | null)[] = []
	private contentTemplates: (TemplateParser | null)[] = []

	init() {
		this.blockVariableName = this.tree.getUniqueBlockName()
		this.slotVariableName = this.slot.getSlotName()
		this.cacheable = this.hasAttrValue(this.node, 'cache')

		let nextNodes = this.eatNext('lu:elseif', 'lu:else')
		let allNodes = [this.node, ...nextNodes]
		let valueIndices: (number | null)[] = []
		let lastValueIndex: number | null = null
		let contentTemplates: (TemplateParser | null)[] = []

		for (let node of allNodes) {
			let valueIndex = this.getAttrValueIndex(node)
			
			if (valueIndex === null && node.tagName !== 'lu:else') {
				throw new Error('<' + node.tagName + ' ${...}> must accept a parameter as condition!')
			}

			if (valueIndex !== null && node.tagName === 'lu:else') {
				throw new Error('<' + node.tagName + '> should not accept any parameter!')
			}

			if (valueIndex === null && lastValueIndex === null) {
				throw new Error('<lu:else> is allowed only one to exist on the tail!')
			}

			valueIndices.push(valueIndex)
			lastValueIndex = valueIndex
	
			if (node.children.length > 0) {
				let template = this.template.separateChildrenAsTemplate(node)
				contentTemplates.push(template)
			}
			else {
				contentTemplates.push(null)
			}
		}

		// Ensure always have an `else` branch.
		if (lastValueIndex !== null) {
			contentTemplates.push(null)
		}

		this.contentTemplates = contentTemplates
		this.valueIndices = valueIndices
	}

	outputInit() {
		let blockClassName = this.cacheable ? 'CacheableIfBlock' : 'IfBlock'
		Modifier.addImport(blockClassName, '@pucelle/lupos.js')

		// let $block_0 = new IfBlock / CacheableIfBlock(
		//   new TemplateSlot(new SlotPosition(SlotPositionType.Before, nextChild)),
		// )
		let allBeResult = this.contentTemplates.every(t => t)
		let slotContentType = allBeResult ? SlotContentType.TemplateResult : null
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
		let toValue = this.outputConditionalExpression()

		// $block_0.update($values[0])
		return factory.createCallExpression(
			factory.createPropertyAccessExpression(
				factory.createIdentifier(this.blockVariableName),
				factory.createIdentifier('update')
			),
			undefined,
			[toValue]
		)
	}

	/** Make an index output function by an if condition value index sequence. */
	private outputConditionalExpression(): TS.Expression {
		let conditions = this.valueIndices.map(index => {
			if (index === null) {
				return factory.createNull()
			}
			else {
				return this.template.values.getRawValue(index)
			}
		})

		let contents = this.contentTemplates.map(template => {
			if (template === null) {
				return factory.createNull()
			}
			else {
				return template.output()
			}
		})

		// Make a new expression: `cond1 ? content1 : cond2 ? content2 : ...`
		let value = Helper.pack.toConditionalExpression(conditions, contents)

		// Add it as a value item to original template, and returned it's reference.
		let toValue = this.template.values.outputCustomValue(value)

		return toValue
	}
}