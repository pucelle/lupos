import type ts from 'typescript'
import {SlotParserBase} from './base'
import {factory} from '../../../core'
import {SlotContentType} from '../../../enums'


export class ContentSlotParser extends SlotParserBase {

	/** $slot_0 */
	private slotVariableName: string = ''

	/** $latest_0 */
	private latestVariableNames: (string | null)[] | null = null

	/** new TemplateSlot(...) */
	private templateSlotGetter!: () => ts.Expression

	override preInit() {
		let slotContentType = this.identifySlotContentType()
		this.slotVariableName = this.makeSlotName()

		if (this.isAnyValueCantTransfer()) {

			// Assume for `TemplateResult` or `TemplateResult[]`, it regenerates every time.
			// And for node, slot itself will compare value.
			if (slotContentType !== SlotContentType.TemplateResult
				&& slotContentType !== SlotContentType.TemplateResultList
				&& slotContentType !== SlotContentType.Node
			) {
				this.latestVariableNames = this.makeGroupOfLatestNames()
			}
		}

		this.templateSlotGetter = this.prepareAsTemplateSlot(slotContentType)
	}

	private identifySlotContentType(): number | null {
		if (this.valueIndices) {
			return this.template.values.identifyValueContentType(this.valueIndices[0])
		}
		else {
			return null
		}
	}

	override outputInit() {
		let templateSlot = this.templateSlotGetter()

		return this.createVariableAssignment(
			this.slotVariableName,
			templateSlot
		)
	}

	override outputUpdate() {

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