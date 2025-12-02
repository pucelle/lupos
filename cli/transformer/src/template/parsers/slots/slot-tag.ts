import * as ts from 'typescript'
import {SlotParserBase} from './base'
import {factory, Modifier} from '../../../core'
import {VariableNames} from '../variable-names'
import {SlotContentType, SlotPositionType} from '../../../enums'
import {TemplateParser} from '../template'


export class SlotTagSlotParser extends SlotParserBase {

	/** To parse content of `<slot>...</slot>` */
	private defaultContentParser: TemplateParser | null = null

	/** $slot_0 */
	private slotVariableName: string = ''

	preInit() {

		// Slot default content.
		if (this.name && this.node.children.length > 0) {
			this.defaultContentParser = this.template.separateChildrenAsTemplate(this.node)
		}

		// $slot_0
		if (this.name) {
			this.slotVariableName = this.makeSlotName()
		}
	}

	outputInit() {
		if (this.name) {
			return this.outputNamedInit()
		}

		return []
	}

	outputMoreInit() {
		if (!this.name) {
			return this.outputNonNamedInit()
		}

		return []
	}

	private outputNamedInit() {
		Modifier.addImport('TemplateSlot', 'lupos.html')
		Modifier.addImport('SlotPosition', 'lupos.html')

		let nodeName = this.getRefedNodeName()
		let slotContentType = this.defaultContentParser ? null : SlotContentType.Node
		let slotContentTypeNodes = slotContentType ? [factory.createNumericLiteral(slotContentType)] : []

		let templateSlot = factory.createNewExpression(
			factory.createIdentifier('TemplateSlot'),
			[factory.createLiteralTypeNode(factory.createNull())],
			[
				factory.createNewExpression(
					factory.createIdentifier('SlotPosition'),
					undefined,
					[
						factory.createNumericLiteral(SlotPositionType.AfterContent),
						factory.createIdentifier(nodeName)
					]
				),
				...slotContentTypeNodes
			]
		)

		// `let $slot_0 = new TemplateSlot<null>(
		// 	 new SlotPosition(SlotPositionType.AfterContent, s),
		// 	 $context
		// )`
		// It's not a known content type slot, slot elements may be empty,
		// and then we would use default content.
		return this.createVariableAssignment(
			this.slotVariableName,
			templateSlot
		)
	}

	private outputNonNamedInit() {
		let nodeName = this.getRefedNodeName()

		// `$node_0.append(...$context.$getRestSlotNodes())`
		return factory.createCallExpression(
			factory.createPropertyAccessExpression(
				factory.createIdentifier(nodeName),
				factory.createIdentifier('append')
			),
			undefined,
			[factory.createSpreadElement(factory.createCallExpression(
				factory.createPropertyAccessExpression(
				factory.createIdentifier(VariableNames.context),
				factory.createIdentifier('$getRestSlotNodes')
				),
				undefined,
				[]
			))]
		)
	}

	outputUpdate() {
		if (this.name) {
			return this.outputNamedUpdate()
		}
		else {
			return []
		}
	}

	private outputNamedUpdate() {
		Modifier.addImport('TemplateSlot', 'lupos.html')

		// `this.$getSlotElement(slotName)`
		let value: ts.Expression = factory.createCallExpression(
			factory.createPropertyAccessExpression(
				factory.createThis(),
				factory.createIdentifier('$getSlotElement')
			),
			undefined,
			[factory.createStringLiteral(this.name!)]
		)

		// this.$getSlotElement(slotName) || new CompiledTemplateResult($maker_0, $values)
		if (this.defaultContentParser) {

			// Haven't prepared `defaultContentParser`, so must add import manually.
			Modifier.addImport('CompiledTemplateResult', 'lupos.html')

			value = factory.createBinaryExpression(
				value,
				factory.createToken(ts.SyntaxKind.QuestionQuestionToken),
				this.defaultContentParser.outputReplaced()
			)
		}

		// Add it as a value item to original template, and returned it's reference.
		let toValue = this.outputCustomValue(value)

		// $slot_0.update($values[0])
		return factory.createCallExpression(
			factory.createPropertyAccessExpression(
				factory.createIdentifier(this.slotVariableName),
				factory.createIdentifier('update')
			),
			undefined,
			[toValue]
		)
	}
}