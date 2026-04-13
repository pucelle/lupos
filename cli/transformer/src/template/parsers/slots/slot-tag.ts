import {SlotParserBase} from './base'
import {factory} from '../../../core'
import {VariableNames} from '../variable-names'


export class SlotTagSlotParser extends SlotParserBase {

	override preInit() {}

	override outputMoreInit() {
		let nodeName = this.getRefedNodeName()

		// `$context.$applyRestSlotNodes($node_0)`
		return factory.createCallExpression(
			factory.createPropertyAccessExpression(
				factory.createIdentifier(VariableNames.context),
				factory.createIdentifier('$applyRestSlotNodes')
			),
			undefined,
			[
				factory.createIdentifier(nodeName)
			]
		)
	}

	override outputUpdate() {
		return []
	}
}