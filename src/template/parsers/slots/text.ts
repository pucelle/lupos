import {SlotParserBase} from './base'
import {factory, ts} from '../../../base'


export class TextSlotParser extends SlotParserBase {

	/** $latest_0 */
	private latestVariableName: string | null = null

	init() {
		if (this.isValueMutable()) {
			this.latestVariableName = this.tree.getUniqueLatestName()
		}
	}

	outputUpdate() {
		let nodeName = this.getRefedNodeName()

		// $values[0]
		let value = this.outputValue()

		// if ($latest_0 !== $values[0]) {
		//   $node_0.data = $latest_0 = $values[0]
		// }
		if (this.latestVariableName) {
			return factory.createIfStatement(
				factory.createBinaryExpression(
					factory.createIdentifier(this.latestVariableName),
					factory.createToken(ts.SyntaxKind.ExclamationEqualsEqualsToken),
					value
				),
				factory.createBlock(
					[
						factory.createExpressionStatement(factory.createBinaryExpression(
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
						))
					],
					true
				),
				undefined
			)
		}

		// $node_0.data = $values[0]
		else {
			return factory.createBinaryExpression(
				factory.createPropertyAccessExpression(
					factory.createIdentifier(nodeName),
					factory.createIdentifier('data')
				),
				factory.createToken(ts.SyntaxKind.EqualsToken),
				value
			)
		}
	}
}