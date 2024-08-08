import {SlotParserBase} from './base'
import {factory, ts} from '../../../../base'


export class TextSlotParser extends SlotParserBase {

	/** $latest_0 */
	private latestVariableName: string = ''

	init() {
		this.latestVariableName = this.tree.getUniqueLatestName()
	}

	outputUpdate() {
		let nodeName = this.getRefedNodeName()

		// $values[0]
		let value = this.getOutputValueNode()

		// $latest_0 === $values[0] && $node_0.data = $latest_0 = $values[0]
		return factory.createBinaryExpression(
			factory.createBinaryExpression(
				factory.createIdentifier(this.latestVariableName),
				factory.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken),
				value
			),
			factory.createToken(ts.SyntaxKind.AmpersandAmpersandToken),
			factory.createBinaryExpression(
				factory.createPropertyAccessExpression(
					factory.createIdentifier(nodeName),
					factory.createIdentifier('data')
				),
				factory.createToken(ts.SyntaxKind.EqualsToken),
				factory.createBinaryExpression(
					factory.createIdentifier(this.latestVariableName),
					factory.createToken(ts.SyntaxKind.EqualsToken),
					value
				)
			)
		)
	}
}