import {SlotParserBase} from './base'
import {factory, Helper, ts} from '../../../base'
import {SlotContentType} from '../../../enums'


export class ContentSlotParser extends SlotParserBase {

	/** Of `SlotContentType` */
	private slotContentType: SlotContentType | null = null

	/** $slot_0 */
	private slotVariableName: string = ''

	/** $latest_0 */
	private latestVariableName: string | null = null

	init() {
		this.slotContentType = this.identifySlotContentType()
		this.slotVariableName = this.getSlotName()

		if (this.isValueMutable()) {

			// Assume for `TemplateResult` or `TemplateResult[]`, it regenerates every time.
			// And for node, slot itself will compare value.
			if (this.slotContentType !== SlotContentType.TemplateResult
				&& this.slotContentType !== SlotContentType.TemplateResultList
				&& this.slotContentType !== SlotContentType.Node
			) {
				this.latestVariableName = this.treeParser.getUniqueLatestName()
			}
		}
	}

	private identifySlotContentType(): number | null {
		let valueNode = this.getFirstRawValueNode()
		let valueType = valueNode ? Helper.types.getType(valueNode) : null
		let typeText = valueType ? Helper.types.getTypeFullText(valueType) : null
		let slotContentType: number | null = null

		if (typeText === 'TemplateResult') {
			slotContentType = SlotContentType.TemplateResult
		}
		else if (typeText === 'TemplateResult[]') {
			slotContentType = SlotContentType.TemplateResultList
		}
		else if (typeText === 'string' || typeText === 'number'
			|| valueType && Helper.types.isNonNullableValueType(valueType)
		) {
			slotContentType = SlotContentType.Text
		}
		else if (typeText && /^(?:\w*?Element|Node|Comment|Text)$/.test(typeText)) {
			slotContentType = SlotContentType.Node
		}

		return slotContentType
	}

	outputInit() {
		let templateSLot = this.outputTemplateSlot(this.slotContentType)

		return this.createVariableAssignment(
			this.slotVariableName,
			templateSLot
		)
	}

	outputUpdate() {

		// $values[0]
		let value = this.outputValue()

		// $latest_0 !== $values[0] && $slot_0.update($latest_0 = $values[0])
		if (this.latestVariableName) {
			return factory.createIfStatement(
				factory.createBinaryExpression(
					factory.createIdentifier(this.latestVariableName),
					factory.createToken(ts.SyntaxKind.ExclamationEqualsEqualsToken),
					value
				),
				factory.createBlock(
					[
						factory.createExpressionStatement(factory.createCallExpression(
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
						)),
					],
					true
				),
				undefined
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
				[value]
			)
		}
	}
}