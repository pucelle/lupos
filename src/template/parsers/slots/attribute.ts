import {SlotParserBase} from './base'
import {factory, Helper, ts} from '../../../base'


export class AttributeSlotParser extends SlotParserBase {

	/** Attribute name. */
	declare readonly name: string

	/** $latest_0 */
	private latestVariableNames: (string | null)[] | null = null

	init() {
		if (this.isAnyValueMutable()) {
			this.latestVariableNames = this.makeGroupOfLatestNames()
		}
	}

	outputUpdate() {
		let slotNode = this.getFirstRawValueNode()
		let slotNodeType = slotNode ? Helper.types.getType(slotNode) : null

		// `$values[0]` is not nullable
		if (this.hasString() || Helper.types.isNonNullableValueType(slotNodeType!)) {
			return this.outputNonNullableValueUpdate()
		}

		// `$values[0]` is nullable
		else {
			return this.outputNullableValueUpdate()
		}
	}

	private outputNonNullableValueUpdate() {

		// $node_0
		let nodeName = this.getRefedNodeName()

		// $values[0]
		let value = this.outputValue()

		// if ($latest_0 !== $values[0]) {
		//   $node_0.setAttribute(attrName, $values[0])
		//   $latest_0 = $values[0]
		// }
		if (this.latestVariableNames) {
			return factory.createIfStatement(
				this.outputLatestComparison(this.latestVariableNames, value.valueNodes),
				factory.createBlock(
					[
						factory.createExpressionStatement(factory.createCallExpression(
							factory.createPropertyAccessExpression(
								factory.createIdentifier(nodeName),
								factory.createIdentifier('setAttribute')
							),
							undefined,
							[
								factory.createStringLiteral(this.name),
								value.joint
							]
						)),
						...this.outputLatestAssignments(this.latestVariableNames, value.valueNodes),
					],
					true
				),
				undefined
			)
		}

		// $node_0.setAttribute(attrName, $values[0])
		else {
			return factory.createCallExpression(
				factory.createPropertyAccessExpression(
					factory.createIdentifier(nodeName),
					factory.createIdentifier('setAttribute')
				),
				undefined,
				[
					factory.createStringLiteral(this.name),
					value.joint
				]
			)
		}
	}

	private outputNullableValueUpdate() {

		// $node_0
		let nodeName = this.getRefedNodeName()

		// $values[0]
		let value = this.outputValue()

		// if ($latest_0 === $values[0]) { 
		// 	 $values[0] === null ? $node_0.removeAttribute(attrName) : $node_0.setAttribute(attrName, $values[0])
		//	 $latest_0 = $values[0]
		// }
		if (this.latestVariableNames) {
			return factory.createIfStatement(
				this.outputLatestComparison(this.latestVariableNames, value.valueNodes),
				factory.createBlock(
					[
						factory.createExpressionStatement(factory.createConditionalExpression(
							factory.createBinaryExpression(
								value.joint,
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
								[factory.createStringLiteral(this.name)]
							),
							factory.createToken(ts.SyntaxKind.ColonToken),
							factory.createCallExpression(
								factory.createPropertyAccessExpression(
									factory.createIdentifier(nodeName),
									factory.createIdentifier('setAttribute')
								),
								undefined,
								[
									factory.createStringLiteral(this.name),
									value.joint
								]
							)
						)),
						...this.outputLatestAssignments(this.latestVariableNames, value.valueNodes),
					],
					true
				)
			)
		}

		// $values[0] === null ? $node_0.removeAttribute(attrName) : $node_0.setAttribute(attrName, $values[0])
		else {
			return factory.createConditionalExpression(
				factory.createBinaryExpression(
					value.joint,
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
					[factory.createStringLiteral(this.name)]
				),
				factory.createToken(ts.SyntaxKind.ColonToken),
				factory.createCallExpression(
					factory.createPropertyAccessExpression(
						factory.createIdentifier(nodeName),
						factory.createIdentifier('setAttribute')
					),
					undefined,
					[
						factory.createStringLiteral(this.name),
						value.joint
					]
				)
			)
		}
	}
}