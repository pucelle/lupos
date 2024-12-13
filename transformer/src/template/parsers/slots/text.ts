import {SlotParserBase} from './base'
import {factory} from '../../../core'
import ts = require('typescript')


export class TextSlotParser extends SlotParserBase {

	declare strings: string[] | null

	/** $latest_0 */
	private latestVariableNames: (string | null)[] | null = null

	preInit() {
		if (this.isAnyValueMutable()) {
			this.latestVariableNames = this.makeGroupOfLatestNames()
		}
	}

	outputUpdate() {
		let nodeName = this.getRefedNodeName()

		// $values[0]
		let value = this.outputValue()

		// if ($latest_0 !== $values[0]) {
		//   $node_0.data = $latest_0 = $values[0]
		// }
		if (this.latestVariableNames) {
			return factory.createIfStatement(
				this.outputLatestComparison(this.latestVariableNames, value.valueNodes),
				factory.createBlock(
					[
						factory.createExpressionStatement(factory.createBinaryExpression(
							factory.createPropertyAccessExpression(
								factory.createIdentifier(nodeName),
								factory.createIdentifier('data')
							),
							factory.createToken(ts.SyntaxKind.EqualsToken),
							value.joint
						)),
						...this.outputLatestAssignments(this.latestVariableNames, value.valueNodes),
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
				value.joint
			)
		}
	}
}