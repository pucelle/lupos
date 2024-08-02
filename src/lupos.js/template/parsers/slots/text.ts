import {SlotBase} from './base'
import {factory, ts} from '../../../../base'
import {VariableNames} from '../variable-names'


export class TextSlot extends SlotBase {

	/** $latest_0 */
	private latestVariableName: string = ''

	init() {
		this.latestVariableName = this.tree.getUniqueLatestVariableName()
	}

	outputUpdate() {
		let nodeName = this.tree.references.getReferenceName(this.node)

		let value = factory.createElementAccessExpression(
			factory.createIdentifier(VariableNames.values),
			factory.createNumericLiteral(this.valueIndex!)
		)

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