import type TS from 'typescript'
import {SlotParserBase} from './base'
import {factory, Helper} from '../../../base'
import {SlotContentType} from '../../../enums'


export class ContentSlotParser extends SlotParserBase {

	/** $slot_0 */
	private slotVariableName: string = ''

	/** $latest_0 */
	private latestVariableNames: (string | null)[] | null = null

	/** new TemplateSlot(...) */
	private templateSlotGetter!: () => TS.Expression

	preInit() {
		let slotContentType = this.identifySlotContentType()
		this.slotVariableName = this.makeSlotName()

		if (this.isAnyValueMutable()) {

			// Assume for `TemplateResult` or `TemplateResult[]`, it regenerates every time.
			// And for node, slot itself will compare value.
			if (slotContentType !== SlotContentType.TemplateResult
				&& slotContentType !== SlotContentType.TemplateResultList
				&& slotContentType !== SlotContentType.Node
			) {
				this.latestVariableNames = this.makeGroupOfLatestNames()
			}
		}

		this.templateSlotGetter = this.prepareTemplateSlot(slotContentType)
	}

	private identifySlotContentType(): number | null {
		let valueNode = this.getFirstRawValueNode()
		let valueType = valueNode ? Helper.types.typeOf(valueNode) : null
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
		let templateSlot = this.templateSlotGetter()

		return this.createVariableAssignment(
			this.slotVariableName,
			templateSlot
		)
	}

	outputUpdate() {

		// $values[0]
		let value = this.outputValue()

		// if ($latest_0 !== $values[0]) {
		//   $slot_0.update($values[0])
		//   $latest_0 = $values[0]
		// }
		if (this.latestVariableNames) {
			return factory.createIfStatement(
				this.outputLatestComparison(this.latestVariableNames, value.valueNodes),
				factory.createBlock(
					[
						factory.createExpressionStatement(factory.createCallExpression(
							factory.createPropertyAccessExpression(
								factory.createIdentifier(this.slotVariableName),
								factory.createIdentifier('update')
							),
							undefined,
							[
								value.joint
							]
						)),
						...this.outputLatestAssignments(this.latestVariableNames, value.valueNodes),
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
				[value.joint]
			)
		}
	}
}