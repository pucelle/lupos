import type TS from 'typescript'
import {SlotBase} from './base'
import {factory, helper, modifier, TemplateSlotPlaceholder, ts} from '../../../../base'
import {HTMLNodeType} from '../../html-syntax'
import {VariableNames} from '../variable-names'


export class ContentSlot extends SlotBase {

	/** Of `SlotContentType` */
	private slotContentType: number | null = null

	/** $slot_0 */
	private slotVariableName: string = ''

	/** $latest_0 */
	private latestVariableName: string | null = null

	init() {
		this.slotContentType = this.identifySlotContentType()
		this.slotVariableName = this.tree.getUniqueSlotVariableName()

		if (this.tree.template.isValueAtIndexMutable(this.valueIndex!)) {

			// Assume for `TemplateResult` or `TemplateResult[]`, it regenerates every time.
			if (this.slotContentType === 2 || this.slotContentType === 3) {
				this.latestVariableName = this.tree.getUniqueLatestVariableName()
			}
		}
	}

	private identifySlotContentType(): number | null {
		let valueNode = this.tree.template.slotNodes[this.valueIndex!]
		let typeText = helper.types.getTypeFullText(helper.types.getType(valueNode))

		
		let slotContentType: number | null = null

		if (typeText === 'TemplateResult') {
			slotContentType = 0
		}
		else if (typeText === 'TemplateResult[]') {
			slotContentType = 1
		}
		else if (typeText === 'string' || typeText === 'number') {
			slotContentType = 2
		}
		else if (/^\w*?(Node|Element)$/.test(typeText)) {
			slotContentType = 3
		}

		return slotContentType
	}

	outputInit() {
		modifier.addImport('TemplateSlot', '@pucelle/lupos.js')
		modifier.addImport('SlotPosition', '@pucelle/lupos.js')

		let position: number
		let nextNode = this.node.nextSibling
		let parent = this.node.parent!
		let nodeName: string

		// Use next node to locate.
		if (nextNode && nextNode.type !== HTMLNodeType.Comment) {
			nodeName = this.tree.references.getReferenceName(nextNode)
			this.node.remove()

			// SlotPositionType.Before
			position = 2
		}
		
		// Parent is stable enough.
		else if (parent.tagName !== 'template'
			&& !TemplateSlotPlaceholder.hasSlotIndex(parent.tagName!)
		) {
			nodeName = this.tree.references.getReferenceName(parent)
			this.node.remove()

			// SlotPositionType.AfterContent
			position = 1
		}

		// Use the comment node to locate.
		else {
			nodeName = this.tree.references.getReferenceName(this.node)

			// SlotPositionType.Before
			position = 2
		}


		// $slot_0 = new TemplateSlot(
		//   new SlotPosition(SlotPositionType.Before / AfterContent, $context),
		//   context,
		//   ?SlotContentType.xxx
		// )
		let templateSlotParams: TS.Expression[] = [
			factory.createNewExpression(
				factory.createIdentifier('SlotPosition'),
				undefined,
				[
					factory.createNumericLiteral(position),
					factory.createIdentifier(nodeName)
				]
			),
			factory.createIdentifier(VariableNames.context)
		]

		// Knows about content type.
		if (this.slotContentType !== null) {
			templateSlotParams.push(factory.createNumericLiteral(this.slotContentType))
		}

		return factory.createBinaryExpression(
			factory.createIdentifier(this.slotVariableName),
			factory.createToken(ts.SyntaxKind.EqualsToken),
			factory.createNewExpression(
				factory.createIdentifier('TemplateSlot'),
				undefined,
				templateSlotParams
			)
		)
	}

	outputUpdate() {

		// $values[0]
		let value = factory.createElementAccessExpression(
			factory.createIdentifier(VariableNames.values),
			factory.createNumericLiteral(this.valueIndex!)
		)

		// $latest_0 === $values[0] && $slot_0.update($latest_0 = $values[0])
		if (this.latestVariableName) {
			return factory.createBinaryExpression(
				factory.createBinaryExpression(
					factory.createIdentifier(this.latestVariableName),
					factory.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken),
					value
				),
				factory.createToken(ts.SyntaxKind.AmpersandAmpersandToken),
				factory.createCallExpression(
					factory.createPropertyAccessExpression(
						factory.createIdentifier(this.slotVariableName),
						factory.createIdentifier('update')
					),
					undefined,
					[
						factory.createBinaryExpression(
							factory.createIdentifier(this.latestVariableName),
							factory.createToken(ts.SyntaxKind.EqualsToken),
							value
						)
					]
				),
			)
		}

		// $slot_0.update($values[0])
		else {
			return factory.createCallExpression(
				factory.createPropertyAccessExpression(
					factory.createIdentifier(this.slotVariableName),
					factory.createIdentifier('update')
				),
				undefined,
				[
					value
				]
			)
		}
	}
}