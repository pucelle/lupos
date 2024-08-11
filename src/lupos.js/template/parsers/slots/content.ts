import {SlotParserBase} from './base'
import {factory, Helper, ts} from '../../../../base'


export class ContentSlotParser extends SlotParserBase {

	/** Of `SlotContentType` */
	private slotContentType: number | null = null

	/** $slot_0 */
	private slotVariableName: string = ''

	/** $latest_0 */
	private latestVariableName: string | null = null

	init() {
		this.slotContentType = this.identifySlotContentType()
		this.slotVariableName = this.tree.getUniqueSlotName()

		if (this.isValueMutable()) {

			// Assume for `TemplateResult` or `TemplateResult[]`, it regenerates every time.
			if (this.slotContentType === 2 || this.slotContentType === 3) {
				this.latestVariableName = this.tree.getUniqueLatestName()
			}
		}
	}

	private identifySlotContentType(): number | null {
		let valueNode = this.getRawNode()
		let typeText = Helper.types.getTypeFullText(Helper.types.getType(valueNode))
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
		let templateSLot = this.makeTemplateSlotNode(this.slotContentType)

		return factory.createBinaryExpression(
			factory.createIdentifier(this.slotVariableName),
			factory.createToken(ts.SyntaxKind.EqualsToken),
			templateSLot
		)
	}

	outputUpdate() {

		// $values[0]
		let value = this.outputValueNode()

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
				[value]
			)
		}
	}
}