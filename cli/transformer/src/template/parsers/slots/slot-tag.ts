import {SlotParserBase} from './base'
import {transformContext} from '../../../core'


export class SlotTagSlotParser extends SlotParserBase {

	override preInit() {}

	override outputMoreInit() {
		let nodeName = this.getRefedNodeName()

		// `$context.$applyRestSlotNodes($node_0)`
		return transformContext.factory.createCallExpression(
			transformContext.factory.createPropertyAccessExpression(
				this.tree.createContextIdentifier(),
				transformContext.factory.createIdentifier('$applyRestSlotNodes')
			),
			undefined,
			[
				transformContext.factory.createIdentifier(nodeName)
			]
		)
	}

	override outputUpdate() {
		return []
	}
}
