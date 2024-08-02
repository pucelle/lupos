import {SlotBase} from './base'
import {factory, helper, ts} from '../../../../base'


export class AttributeSlot extends SlotBase {

	declare readonly name: string
	declare readonly valueIndex: number

	/** $latest_0 */
	private latestVariableName: string | null = null

	init() {
		if (this.tree.template.isValueAtIndexMutable(this.valueIndex)) {
			this.latestVariableName = this.tree.getUniqueLatestVariableName()
		}
	}

	outputUpdate() {
		let slotNode = this.tree.template.slotNodes[this.valueIndex]
		let slotNodeType = helper.types.getType(slotNode)

		// `$values[0]` is not nullable
		if (helper.types.isNonNullableValueType(slotNodeType)) {
			return this.outputNonNullableValueUpdate()
		}
		
		// `$values[0]` is nullable
		else {
			return this.outputNullableValueUpdate()
		}
	}

	private outputNonNullableValueUpdate() {

		// $node_0
		let nodeName = this.tree.references.getReferenceName(this.node)

		// $values[0]
		let value = this.getOutputValueNode()

		// $latest_0 === $values[0] && $node_0.setAttribute(attrName, $latest_0 = $values[0])
		if (this.latestVariableName) {
			return factory.createBinaryExpression(
				factory.createBinaryExpression(
					factory.createIdentifier(this.latestVariableName),
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
						factory.createIdentifier(this.name),
						factory.createBinaryExpression(
							factory.createIdentifier(this.latestVariableName),
							factory.createToken(ts.SyntaxKind.EqualsToken),
							value
						)
					]
				)
			)
		}

		//$node_0.setAttribute(attrName, $values[0])
		else {
			return factory.createCallExpression(
				factory.createPropertyAccessExpression(
					factory.createIdentifier(nodeName),
					factory.createIdentifier('setAttribute')
				),
				undefined,
				[
					factory.createIdentifier(this.name),
					value
				]
			)
		}
	}

	private outputNullableValueUpdate() {
		// $node_0
		let nodeName = this.tree.references.getReferenceName(this.node)

		// $values[0]
		let value = this.getOutputValueNode()

		// if ($latest_0 === $values[0]) { 
		// 	 $values[0] === null ? $node_0.removeAttribute(attrName) : $node_0.setAttribute(attrName, $values[0])
		//	 $latest_0 = $values[0]
		// }
		if (this.latestVariableName) {
			return factory.createIfStatement(
				factory.createBinaryExpression(
					factory.createIdentifier(this.latestVariableName),
					factory.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken),
					value
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
								[factory.createIdentifier(this.name)]
							),
							factory.createToken(ts.SyntaxKind.ColonToken),
							factory.createCallExpression(
								factory.createPropertyAccessExpression(
									factory.createIdentifier(nodeName),
									factory.createIdentifier('setAttribute')
								),
								undefined,
								[
									factory.createIdentifier(this.name),
									value
								]
							)
						)),
						factory.createExpressionStatement(factory.createBinaryExpression(
							factory.createIdentifier(this.latestVariableName),
							factory.createToken(ts.SyntaxKind.EqualsToken),
							value
						))
					],
					true
				)
			)
		}

		// $values[0] === null ? $node_0.removeAttribute(attrName) : $node_0.setAttribute(attrName, $values[0])
		else {
			return factory.createConditionalExpression(
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
					[factory.createIdentifier(this.name)]
				),
				factory.createToken(ts.SyntaxKind.ColonToken),
				factory.createCallExpression(
					factory.createPropertyAccessExpression(
						factory.createIdentifier(nodeName),
						factory.createIdentifier('setAttribute')
					),
					undefined,
					[
						factory.createIdentifier(this.name),
						value
					]
				)
			)
		}
	}
}