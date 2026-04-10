import {SlotParserBase} from './base'
import {factory} from '../../../core'
import {VariableNames} from '../variable-names'


export class SlotTagSlotParser extends SlotParserBase {

	override preInit() {}

	override outputMoreInit() {
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

	override outputUpdate() {
		return []
	}
}