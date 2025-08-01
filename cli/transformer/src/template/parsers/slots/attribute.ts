import {SlotParserBase} from './base'
import {factory, Packer, helper} from '../../../core'
import {cleanList} from '../../../utils'
import * as ts from 'typescript'
import {TemplateSlotPlaceholder} from '../../../lupos-ts-module'


export class AttributeSlotParser extends SlotParserBase {

	/** Attribute name. */
	declare name: string
	declare prefix: string

	/** 
	 * `?:attr=value`, remove binding if value is false like,
	 * and set attribute to be empty string if value is true like.
	 */
	protected withQueryToken: boolean = false

	/** $latest_0 */
	private latestVariableNames: (string | null)[] | null = null

	/** 
	 * `<template ...>`, or `<Com ...>`
	 * Current attribute may need to share with another attribute modification.
	 * */
	private isSharedModification: boolean = false

	preInit() {
		if (this.prefix === '?') {
			this.withQueryToken = true
		}

		this.isSharedModification = this.node.tagName === 'template'
			|| TemplateSlotPlaceholder.isComponent(this.node.tagName!)
			|| (this.name === 'class' || this.name === 'style') && !!this.node.attrs?.find(attr => attr.name.startsWith(':' + this.name))

		if (this.isAnyValueCantTransfer()) {
			this.latestVariableNames = this.makeGroupOfLatestNames()
		}
	}

	outputUpdate() {
		let slotNode = this.getFirstRawValueNode()
		let slotNodeType = slotNode ? helper.types.typeOf(slotNode) : null

		// `class="..."`, `class="${}"` has been upgraded to binding normally.
		if (this.isSharedModification && this.hasString() && !this.hasValueIndex()) {
			if (this.name === 'class') {
				return this.outputSharedClassOutput()
			}

			// style="..."
			else if (this.name === 'style') {
				return this.outputSharedStyleOutput()
			}
		}

		// `?attr=value`
		if (this.withQueryToken) {
			return this.outputQueryValueUpdate()
		}

		// `$values[0]` is not nullable
		else if (this.hasString() || slotNodeType && helper.types.isNonNullableValueType(slotNodeType!)) {
			return this.outputNonNullableValueUpdate()
		}

		// `$values[0]` is nullable
		else {
			return this.outputNullableValueUpdate()
		}
	}

	private outputSharedClassOutput() {
		let string = this.strings![0]
		let nodeName = this.getRefedNodeName()
		let classNames = cleanList(string.split(/\s+/))

		return factory.createCallExpression(
			factory.createPropertyAccessExpression(
				factory.createPropertyAccessExpression(
					factory.createIdentifier(nodeName),
					factory.createIdentifier('classList')
				),
				factory.createIdentifier('add')
			),
			undefined,
			classNames.map(n => factory.createStringLiteral(n))
		)
	}

	private outputSharedStyleOutput() {
		let string = this.strings![0]
		let nodeName = this.getRefedNodeName()

		let styles = string.split(/\s*;\s*/)
			.map(v => v.split(/\s*:\s*/))
			.filter(v => v[0])

		let styleNode = factory.createPropertyAccessExpression(
			factory.createIdentifier(nodeName),
			factory.createIdentifier('style')
		)
		
		return styles.map(([prop, value]) => {
			return factory.createBinaryExpression(
				Packer.createAccessNode(
					styleNode,
					prop
				),
				factory.createToken(ts.SyntaxKind.EqualsToken),
				factory.createStringLiteral(value || '')
			)
		})
	}

	private outputQueryValueUpdate() {

		// $node_0
		let nodeName = this.getRefedNodeName()

		// $values[0]
		let value = this.outputValue()

		// if ($latest_0 !== $values[0]) { 
		// 	 $values[0] ? $node_0.setAttribute(attrName, '') : $node_0.removeAttribute(attrName) :
		//	 $latest_0 = $values[0]
		// }
		if (this.latestVariableNames) {
			return factory.createIfStatement(
				this.outputLatestComparison(this.latestVariableNames, value.valueNodes),
				factory.createBlock(
					[
						factory.createExpressionStatement(factory.createConditionalExpression(
							value.joint,
							factory.createToken(ts.SyntaxKind.QuestionToken),
							factory.createCallExpression(
								factory.createPropertyAccessExpression(
									factory.createIdentifier(nodeName),
									factory.createIdentifier('setAttribute')
								),
								undefined,
								[
									factory.createStringLiteral(this.name),
									factory.createStringLiteral('')
								]
							),
							factory.createToken(ts.SyntaxKind.ColonToken),
							factory.createCallExpression(
								factory.createPropertyAccessExpression(
									factory.createIdentifier(nodeName),
									factory.createIdentifier('removeAttribute')
								),
								undefined,
								[factory.createStringLiteral(this.name)]
							)
						)),
						...this.outputLatestAssignments(this.latestVariableNames, value.valueNodes),
					],
					true
				)
			)
		}

		// $values[0] ? $node_0.setAttribute(attrName, $values[0]) : $node_0.removeAttribute(attrName)
		else {
			return factory.createConditionalExpression(
				value.joint,
				factory.createToken(ts.SyntaxKind.QuestionToken),
				factory.createCallExpression(
					factory.createPropertyAccessExpression(
						factory.createIdentifier(nodeName),
						factory.createIdentifier('setAttribute')
					),
					undefined,
					[
						factory.createStringLiteral(this.name),
						factory.createStringLiteral('')
					]
				),
				factory.createToken(ts.SyntaxKind.ColonToken),
				factory.createCallExpression(
					factory.createPropertyAccessExpression(
						factory.createIdentifier(nodeName),
						factory.createIdentifier('removeAttribute')
					),
					undefined,
					[factory.createStringLiteral(this.name)]
				)
			)
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

		// if ($latest_0 !== $values[0]) { 
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

			// Like `autofocus`
			if (helper.isLiteralLike(value.joint)) {
				if (value.joint.kind !== ts.SyntaxKind.NullKeyword) {
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
				else {
					return factory.createCallExpression(
						factory.createPropertyAccessExpression(
							factory.createIdentifier(nodeName),
							factory.createIdentifier('removeAttribute')
						),
						undefined,
						[factory.createStringLiteral(this.name)]
					)
				}
			}
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
}