import {SlotBase} from './base'
import {factory, ts} from '../../../../base'
import {VariableNames} from '../variable-names'


export class PropertySlot extends SlotBase {

	private latestName: string = ''

	init() {
		this.latestName = this.tree.getUniqueLatestVariableName()
	}

	outputUpdate() {
		let nodeTagName = this.node.tagName!

		// `<Com>` property
		if (/^[A-Z]/.test(nodeTagName)) {
			return this.outputNonNullableValueUpdate()
		}
		
		// `<div>` property
		else {
			return this.outputNullableValueUpdate()
		}
	}

	private outputNonNullableValueUpdate() {
		let nodeName = this.tree.references.getReferenceName(this.node)

		let value = factory.createElementAccessExpression(
			factory.createIdentifier(VariableNames.values),
			factory.createNumericLiteral(this.valueIndex!)
		)

		// $latest_0 === $values[0] && $node_0.setAttribute(attrName, $latest_0 = $values[0])
		return factory.createBinaryExpression(
			factory.createBinaryExpression(
				factory.createIdentifier(this.latestName),
				factory.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken),
				value
			),
			factory.createToken(ts.SyntaxKind.AmpersandAmpersandToken),
			factory.createCallExpression(
				factory.createPropertyAccessExpression(
					factory.createIdentifier(nodeName),
					factory.createIdentifier('setAttribute')
				),
				undefined,
				[
					factory.createIdentifier(this.name!),
					factory.createBinaryExpression(
						factory.createIdentifier(this.latestName),
						factory.createToken(ts.SyntaxKind.EqualsToken),
						value
					)
				]
			)
		)
	}

	private outputNullableValueUpdate() {
		let nodeName = this.tree.references.getReferenceName(this.node)

		let value = factory.createElementAccessExpression(
			factory.createIdentifier(VariableNames.values),
			factory.createNumericLiteral(this.valueIndex!)
		)

		// if ($latest_0 === $values[0]) { 
		// 	 $values[0] === null ? $node_0.removeAttribute(attrName) : $node_0.setAttribute(attrName, $values[0])
		//	 $latest_0 = null
		// }
		return factory.createIfStatement(
			factory.createBinaryExpression(
				factory.createIdentifier(this.latestName),
				factory.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken),
				factory.createElementAccessExpression(
					factory.createIdentifier("$values"),
					factory.createNumericLiteral("0")
				)
			),
			factory.createBlock(
				[
					factory.createExpressionStatement(factory.createConditionalExpression(
						factory.createBinaryExpression(
							value,
							factory.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken),
							factory.createNull()
						),
						factory.createToken(ts.SyntaxKind.QuestionToken),
						factory.createCallExpression(
							factory.createPropertyAccessExpression(
								factory.createIdentifier(nodeName),
								factory.createIdentifier('removeAttribute')
							),
							undefined,
							[factory.createIdentifier(this.name!)]
						),
						factory.createToken(ts.SyntaxKind.ColonToken),
						factory.createCallExpression(
							factory.createPropertyAccessExpression(
								factory.createIdentifier(nodeName),
								factory.createIdentifier('setAttribute')
							),
							undefined,
							[
								factory.createIdentifier(this.name!),
								value
							]
						)
					)),
					factory.createExpressionStatement(factory.createBinaryExpression(
						factory.createIdentifier('$latest_0'),
						factory.createToken(ts.SyntaxKind.EqualsToken),
						factory.createNull()
					))
				],
				true
			)
		)
	}
}