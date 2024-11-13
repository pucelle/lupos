import type TS from 'typescript'
import {factory, Helper, Interpolator, Modifier} from '../../../core'
import {FlowControlBase} from './base'
import {TemplateParser} from '../template'
import {SlotContentType} from '../../../enums'
import {TrackingPatch} from '../../../ff'


export class IfFlowControl extends FlowControlBase {

	/** $block_0 */
	private blockVariableName: string = ''

	/** $slot_0 */
	private slotVariableName: string = ''

	/** new TemplateSlot(...) */
	private templateSlotGetter!: () => TS.Expression

	private cacheable: boolean = false
	private valueIndices: (number | null)[] = []
	private contentTemplates: (TemplateParser | null)[] = []
	private contentRangeStartNodes: (TS.Node | null)[] = []

	preInit() {
		this.blockVariableName = this.tree.makeUniqueBlockName()
		this.slotVariableName = this.slot.makeSlotName()
		this.cacheable = this.hasAttrValue(this.node, 'cache')

		let nextNodes = this.eatNext('lu:elseif', 'lu:else')
		let allNodes = [this.node, ...nextNodes]
		let lastValueIndex: number | null = null

		for (let child of allNodes) {
			let valueIndex = this.getAttrValueIndex(child)
			
			if (valueIndex === null && child.tagName !== 'lu:else') {
				this.slot.diagnoseNormal('<' + child.tagName + ' ${...}> must accept a parameter as condition!')
				break
			}

			if (valueIndex !== null && child.tagName === 'lu:else') {
				this.slot.diagnoseNormal('<lu:else> should not accept any parameter!')
				break
			}

			if (valueIndex === null && lastValueIndex === null) {
				this.slot.diagnoseNormal('<lu:else> is allowed only one to exist on the tail!')
				break
			}

			this.valueIndices.push(valueIndex)
			lastValueIndex = valueIndex
	
			if (child.children.length > 0) {
				let rangeStartNode = this.markTrackingRangeBeforeSeparation(child)
				let template = this.template.separateChildrenAsTemplate(child)
				
				this.contentTemplates.push(template)
				this.contentRangeStartNodes.push(rangeStartNode)
			}
			else {
				this.contentTemplates.push(null)
			}
		}

		// Ensure always have an `else` branch.
		if (lastValueIndex !== null) {
			this.contentTemplates.push(null)
		}

		let allBeResult = this.contentTemplates.every(t => t)
		let slotContentType = allBeResult ? SlotContentType.TemplateResult : null
		this.templateSlotGetter = this.slot.prepareTemplateSlot(slotContentType)
	}

	outputInit() {
		let blockClassName = this.cacheable ? 'CacheableIfBlock' : 'IfBlock'
		Modifier.addImport(blockClassName, '@pucelle/lupos.js')

		// let $block_0 = new IfBlock / CacheableIfBlock(
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
				let rawNode = this.template.values.getRawValue(index)
				return Interpolator.outputNodeSelf(rawNode) as TS.Expression
			}
		})

		let contents = this.contentTemplates.map((template, index) => {
			let rangeStartNode = this.contentRangeStartNodes[index]
			let trackingExps = rangeStartNode ? TrackingPatch.outputCustomRangeTracking(rangeStartNode) : []

			if (template === null) {
				return factory.createNull()
			}
			else {
				let output = template.outputReplaced()
				return Helper.pack.parenthesizeExpressions(...trackingExps, output)
			}
		})

		// Make a new expression: `cond1 ? content1 : cond2 ? content2 : ...`
		let value = Helper.pack.toConditionalExpression(conditions, contents)

		// Add it as a value item to original template, and returned it's reference.
		let toValue = this.slot.outputCustomValue(value)

		return toValue
	}
}