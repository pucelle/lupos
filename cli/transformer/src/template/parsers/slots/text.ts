import {SlotParserBase} from './base'
import {transformContext} from '../../../core'
import ts = require('typescript')


export class TextSlotParser extends SlotParserBase {

	declare strings: string[] | null

	/** $latest_0 */
	private latestVariableNames: (string | null)[] | null = null

	override preInit() {
		if (this.isAnyValueCantTransfer()) {
			this.latestVariableNames = this.makeGroupOfLatestNames()
		}
	}

	override outputUpdate() {
		let nodeName = this.getRefedNodeName()

		// $values[0]
		let value = this.outputValue()

		// if ($latest_0 !== $values[0]) {
		//   $node_0.data = $latest_0 = $values[0]
		// }
		if (this.latestVariableNames) {
			return transformContext.factory.createIfStatement(
				this.outputLatestComparison(this.latestVariableNames, value.valueNodes),
				transformContext.factory.createBlock(
					[
						transformContext.factory.createExpressionStatement(transformContext.factory.createBinaryExpression(
							transformContext.factory.createPropertyAccessExpression(
								transformContext.factory.createIdentifier(nodeName),
								transformContext.factory.createIdentifier('data')
							),
							transformContext.factory.createToken(ts.SyntaxKind.EqualsToken),
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
			return transformContext.factory.createBinaryExpression(
				transformContext.factory.createPropertyAccessExpression(
					transformContext.factory.createIdentifier(nodeName),
					transformContext.factory.createIdentifier('data')
				),
				transformContext.factory.createToken(ts.SyntaxKind.EqualsToken),
				value.joint
			)
		}
	}
}