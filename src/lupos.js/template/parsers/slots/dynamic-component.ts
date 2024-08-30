import type TS from 'typescript'
import {SlotParserBase} from './base'
import {factory, Modifier, ts} from '../../../../base'
import {HTMLNode, HTMLNodeType} from '../../html-syntax'
import {SlotPositionType} from '../../enums'


export class DynamicComponentSlotParser extends SlotParserBase {

	/** $block_0 */
	private blockVariableName: string = ''

	init() {
		this.refAsComponent()
		this.blockVariableName = this.treeParser.getUniqueBlockName()
	}

	/** Get node name and position parameters for outputting template slot. */
	protected getTemplateSlotParameters() {
		let position: number
		let nextNode = this.node.nextSibling
		let parent = this.node.parent!
		let nodeName: string

		// Use next node to locate.
		if (nextNode && nextNode.isPrecedingPositionStable()) {
			nodeName = this.treeParser.references.refAsName(nextNode)
			position = SlotPositionType.Before
		}

		// Parent is stable enough.
		// Would be ok although parent is a dynamic component.
		else if (parent.tagName !== 'tree') {
			nodeName = this.treeParser.references.refAsName(parent)
			position = SlotPositionType.AfterContent
		}

		// Use current node to locate.
		else {
			let comment = new HTMLNode(HTMLNodeType.Comment, {})
			this.node.after(comment)
			nodeName = this.treeParser.references.refAsName(comment)
			position = SlotPositionType.Before
		}

		return {
			nodeName,
			position
		}
	}

	outputInit(nodeAttrInits: TS.Statement[]) {
		Modifier.addImport('DynamicComponentBlock', '@pucelle/lupos.js')

		let nodeName = this.hasNodeRefed() ? this.getRefedNodeName() : null
		let comName = this.getRefedComponentName()

		// let $com_0
		this.treeParser.addPreDeclaredVariableName(comName)

		// let $block_0 = new DynamicComponentBlock(
		//   function(com){
		//     $node_0 = com.el;
		//	   $com_0 = com;
		//	   ...nodeAttrInits
		//   },
		//   new TemplateSlot(new SlotPosition(SlotPositionType.Before, nextChild)),
		//   new SlotRange() / null
		// )

		let binderFn = factory.createFunctionExpression(
			undefined,
			undefined,
			factory.createIdentifier(''),
			undefined,
			[factory.createParameterDeclaration(
				undefined,
				undefined,
				factory.createIdentifier('com'),
				undefined,
				undefined,
				undefined
			)],
			undefined,
			factory.createBlock(
				[
					...(nodeName ? [factory.createExpressionStatement(factory.createBinaryExpression(
						factory.createIdentifier(nodeName),
						factory.createToken(ts.SyntaxKind.EqualsToken),
						factory.createPropertyAccessExpression(factory.createIdentifier('com'), 'el')
					))] : []),
					factory.createExpressionStatement(factory.createBinaryExpression(
						factory.createIdentifier(comName),
						factory.createToken(ts.SyntaxKind.EqualsToken),
						factory.createIdentifier('com')
					)),
					...nodeAttrInits,
				],
				true
			)
		)

		let templateSlot = this.outputTemplateSlot(null)
		let contentRangeNodes = this.node.children.length > 0 ? [this.makeSlotRange()!] : []

		return factory.createVariableStatement(
			undefined,
			factory.createVariableDeclarationList(
				[factory.createVariableDeclaration(
					factory.createIdentifier(this.blockVariableName),
					undefined,
					undefined,
					factory.createNewExpression(
						factory.createIdentifier('DynamicComponentBlock'),
						undefined,
						[
							binderFn,
							templateSlot,
							...contentRangeNodes,
						]
					)
				)],
				ts.NodeFlags.Let
			)
		)
	}

	outputUpdate() {
		let value = this.outputValue()

		// $block_0.update($values[0])
		return factory.createCallExpression(
			factory.createPropertyAccessExpression(
				factory.createIdentifier(this.blockVariableName),
				factory.createIdentifier('update')
			),
			undefined,
			[value]
		)
	}
}