import type TS from 'typescript'
import {HTMLTreeParser} from '../html-tree'
import {SlotParserBase} from './base'
import {factory, modifier, ts} from '../../../../base'
import {VariableNames} from '../variable-names'


export class SlotTagSlotParser extends SlotParserBase {

	/** To parse content of `<slot>...</slot>` */
	private defaultContentParser: HTMLTreeParser | null = null

	/** $slot_0 */
	private slotVariableName: string = ''

	init() {

		// Slot default content.
		if (this.node.children.length > 0) {
			this.defaultContentParser = this.tree.separateChildrenAsSubTree(this.node)
		}

		// $slot_0
		this.slotVariableName = this.tree.getUniqueSlotName()
	}

	outputInit() {
		if (this.name) {
			return this.outputNamedInit()
		}
		else {
			return this.outputNoNamedInit()
		}
	}

	private outputNamedInit() {
		modifier.addImport('TemplateSlot', '@pucelle/lupos.js')
		modifier.addImport('SlotPosition', '@pucelle/lupos.js')

		let nodeName = this.getRefedNodeName()

		// `$slot_0 = new TemplateSlot<null>(
		// 	 new SlotPosition(SlotPositionType.AfterContent, s),
		// 	 $context
		// )`
		// It's not a known content type slot, slot elements may be empty,
		// and then would use default content.
		return factory.createBinaryExpression(
			factory.createIdentifier(this.slotVariableName),
			factory.createToken(ts.SyntaxKind.EqualsToken),
			factory.createNewExpression(
				factory.createIdentifier('TemplateSlot'),
				[factory.createLiteralTypeNode(factory.createNull())],
				[
					factory.createNewExpression(
						factory.createIdentifier('SlotPosition'),
						undefined,
						[
							factory.createNumericLiteral('1'),
							factory.createIdentifier(nodeName)
						]
					),
					factory.createIdentifier(VariableNames.context)
				]
			)
		)
	}

	private outputNoNamedInit() {
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
		modifier.addImport('TemplateSlot', '@pucelle/lupos.js')

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
			modifier.addImport('CompiledTemplateResult', '@pucelle/lupos.js')

			toValue = factory.createBinaryExpression(
				toValue,
				factory.createToken(ts.SyntaxKind.BarBarToken),
				factory.createNewExpression(
					factory.createIdentifier('CompiledTemplateResult'),
					undefined,
					[
						factory.createIdentifier(this.defaultContentParser.getMakerRefName()),
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