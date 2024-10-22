import type TS from 'typescript'
import {factory, Helper, Modifier, ts} from '../../../base'
import {FlowControlBase} from './base'
import {TemplateParser} from '../template'
import {SlotContentType} from '../../../enums'


export class SwitchFlowControl extends FlowControlBase {

	/** $block_0 */
	private blockVariableName: string = ''

	/** $slot_0 */
	private slotVariableName: string = ''

	/** new TemplateSlot(...) */
	private templateSlotGetter!: () => TS.Expression

	private cacheable: boolean = false
	private switchValueIndex: number | null = null
	private valueIndices: (number | null)[] = []
	private contentTemplates: (TemplateParser | null)[] = []

	preInit() {
		this.blockVariableName = this.tree.makeUniqueBlockName()
		this.slotVariableName = this.slot.makeSlotName()
		this.cacheable = this.hasAttrValue(this.node, 'cache')

		let switchValueIndex = this.getAttrValueIndex(this.node)
		if (switchValueIndex === null) {
			this.slot.diagnosticNormal('<lu:switch ${...}> must accept a parameter as condition!')
		}
		this.switchValueIndex = switchValueIndex

		let childNodes = this.node.children
		let valueIndices: (number | null)[] = []
		let lastValueIndex: number | null = null
		let contentTemplates: (TemplateParser | null)[] = []

		for (let child of childNodes) {
			let valueIndex = this.getAttrValueIndex(child)
			if (valueIndex === null && child.tagName === 'lu:case') {
				this.slot.diagnosticNormal('<lu:case ${...}> must accept a parameter as condition!')
				break
			}

			if (valueIndex !== null && child.tagName === 'lu:default') {
				this.slot.diagnosticNormal('<lu:default> should not accept any parameter!')
				break
			}

			if (valueIndex === null && lastValueIndex === null) {
				this.slot.diagnosticNormal('<lu:default> is allowed only one to exist on the tail!')
				break
			}

			valueIndices.push(valueIndex)
			lastValueIndex = valueIndex
	
			if (child.children.length > 0) {
				let template = this.template.separateChildrenAsTemplate(child)
				contentTemplates.push(template)
			}
			else {
				contentTemplates.push(null)
			}

			if (child.tagName === 'lu:default' || valueIndex === null) {
				break
			}
		}

		// Ensure always have an `else` branch.
		if (lastValueIndex !== null) {
			contentTemplates.push(null)
		}

		this.node.empty()
		this.contentTemplates = contentTemplates
		this.valueIndices = valueIndices

		let allBeResult = contentTemplates.every(t => t)
		let slotContentType = allBeResult ? SlotContentType.TemplateResult : null
		this.templateSlotGetter = this.slot.prepareTemplateSlot(slotContentType)
	}

	outputInit() {
		if (this.switchValueIndex === null) {
			return []
		}

		let blockClassName = this.cacheable ? 'CacheableSwitchBlock' : 'SwitchBlock'
		Modifier.addImport(blockClassName, '@pucelle/lupos.js')

		// $block_0 = new SwitchBlock / CacheableSwitchBlock(
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
		if (this.switchValueIndex === null) {
			return []
		}

		let toValue = this.outputConditionalExpression()

		// $block_0.update($values[0])
		return factory.createCallExpression(
			factory.createPropertyAccessExpression(
				factory.createIdentifier(this.blockVariableName),
				factory.createIdentifier('update')
			),
			undefined,
			[
				toValue
			]
		)
	}

	/** Make an index output function by an if condition value index sequence. */
	private outputConditionalExpression(): TS.Expression {
		let switchValue = this.switchValueIndex !== null
			? this.template.values.getRawValue(this.switchValueIndex)
			: factory.createNull()

		let conditions = this.valueIndices.map(index => {
			if (index === null) {
				return factory.createNull()
			}
			else {
				return factory.createBinaryExpression(
					switchValue,
					factory.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken),
					this.template.values.getRawValue(index)
				)
			}
		})

		let contents = this.contentTemplates.map(template => {
			if (template === null) {
				return factory.createNull()
			}
			else {
				return template.outputReplaced()
			}
		})

		// Make a new expression: `cond1 ? content1 : cond2 ? content2 : ...`
		let value = Helper.pack.toConditionalExpression(conditions, contents)

		// Add it as a value item to original template, and returned it's reference.
		let toValue = this.template.values.outputCustomValue(value)

		return toValue
	}
}