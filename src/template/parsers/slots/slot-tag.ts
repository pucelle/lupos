import type TS from 'typescript'
import {TreeParser} from '../tree'
import {SlotParserBase} from './base'
import {factory, Modifier, ts} from '../../../base'
import {VariableNames} from '../variable-names'
import {SlotContentType, SlotPositionType} from '../../../enums'


export class SlotTagSlotParser extends SlotParserBase {

	/** To parse content of `<slot>...</slot>` */
	private defaultContentParser: TreeParser | null = null

	/** $slot_0 */
	private slotVariableName: string = ''

	/** Named slot should be updated dynamically. */
	isValueOutputAsMutable(): boolean {
		return !!this.name
	}

	init() {

		// Slot default content.
		if (this.name && this.node.children.length > 0) {
			this.defaultContentParser = this.treeParser.separateChildrenAsSubTree(this.node)
		}

		// $slot_0
		if (this.name) {
			this.slotVariableName = this.treeParser.getUniqueSlotName()
			this.treeParser.addPart(this.slotVariableName, this.node)
		}
	}

	outputInit() {
		if (this.name) {
			return this.outputNamedInit()
		}
		else {
			return this.outputNonNamedInit()
		}
	}

	private outputNamedInit() {
		Modifier.addImport('TemplateSlot', '@pucelle/lupos.js')
		Modifier.addImport('SlotPosition', '@pucelle/lupos.js')

		let nodeName = this.getRefedNodeName()
		let slotContentType = this.defaultContentParser ? null : SlotContentType.Node
		let slotContentTypeNodes = slotContentType ? [factory.createNumericLiteral(slotContentType)] : []

		// `let $slot_0 = new TemplateSlot<null>(
		// 	 new SlotPosition(SlotPositionType.AfterContent, s),
		// 	 $context
		// )`
		// It's not a known content type slot, slot elements may be empty,
		// and then we would use default content.
		return this.addVariableAssignment(
			this.slotVariableName,
			factory.createNewExpression(
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
					factory.createIdentifier(VariableNames.context),
					...slotContentTypeNodes
				]
			)
		)
	}

	private outputNonNamedInit() {
		let nodeName = this.getRefedNodeName()

		// `$node_0.append(...$context.__getRestSlotNodes())`
		return factory.createCallExpression(
			factory.createPropertyAccessExpression(
				factory.createIdentifier(nodeName),
				factory.createIdentifier('append')
			),
			undefined,
			[factory.createSpreadElement(factory.createCallExpression(
				factory.createPropertyAccessExpression(
				factory.createIdentifier(VariableNames.context),
				factory.createIdentifier('__getRestSlotNodes')
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
		Modifier.addImport('TemplateSlot', '@pucelle/lupos.js')

		// `this.__getSlotElement(slotName)`
		let toValue: TS.Expression = factory.createCallExpression(
			factory.createPropertyAccessExpression(
				factory.createIdentifier(VariableNames.context),
				factory.createIdentifier('__getSlotElement')
			),
			undefined,
			[factory.createStringLiteral(this.name!)]
		)

		// this.__getSlotElement(slotName) || new CompiledTemplateResult($maker_0, $values)
		if (this.defaultContentParser) {
			Modifier.addImport('CompiledTemplateResult', '@pucelle/lupos.js')

			toValue = factory.createBinaryExpression(
				toValue,
				factory.createToken(ts.SyntaxKind.QuestionQuestionToken),
				factory.createNewExpression(
					factory.createIdentifier('CompiledTemplateResult'),
					undefined,
					[
						factory.createIdentifier(this.defaultContentParser.getTemplateRefName()),
						factory.createIdentifier(VariableNames.values)
					]
				)
			)
		}

		// $slot_0.update(this.__getSlotElement(slotName))
		// $slot_0.update(this.__getSlotElement(slotName) || new CompiledTemplateResult($maker_0, $values))
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