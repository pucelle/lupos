import type TS from 'typescript'
import {SlotParserBase} from './base'
import {factory, Modifier, ts} from '../../../base'
import {HTMLNode, HTMLNodeType} from '../../html-syntax'
import {SlotPositionType} from '../../../enums'


export class DynamicComponentSlotParser extends SlotParserBase {

	/** $block_0 */
	private blockVariableName: string = ''

	/** $slot_0 */
	private slotVariableName: string = ''

	init() {
		this.refAsComponent()
		this.blockVariableName = this.tree.makeUniqueBlockName()
		this.slotVariableName = this.makeSlotName()
	}

	/** Get node name and position parameters for outputting template slot. */
	protected getTemplateSlotParameters() {
		let position: number
		let nextNode = this.node.nextSibling
		let nodeName: string

		// Use next node to locate.
		if (nextNode && nextNode.isPrecedingPositionStable()) {
			nodeName = this.tree.references.refAsName(nextNode)
			position = SlotPositionType.Before
		}

		// Use current node to locate.
		else {
			let comment = new HTMLNode(HTMLNodeType.Comment, {})
			this.node.after(comment)
			nodeName = this.tree.references.refAsName(comment)
			position = SlotPositionType.Before
		}

		return {
			nodeName,
			position
		}
	}

	outputInit(nodeAttrInits: TS.Statement[]) {
		Modifier.addImport('DynamicComponentBlock', '@pucelle/lupos.js')

		let hasNodeRefed = this.hasNodeRefed()
		let nodeName = this.getRefedNodeName()
		let comName = this.getRefedComponentName()

		// let $com_0
		this.tree.addPreDeclaredVariableName(comName)

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
					...(hasNodeRefed ? [factory.createExpressionStatement(factory.createBinaryExpression(
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

		// Must not pre-declare.
		let slotInit = this.createVariableAssignment(
			this.slotVariableName,
			templateSlot,
			false
		)


		let contentRangeNodes = this.node.children.length > 0 ? [this.makeSlotRange()!] : []
		
		return [
			slotInit,
			factory.createVariableStatement(
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
								factory.createIdentifier(nodeName),
								factory.createIdentifier(this.slotVariableName),
								...contentRangeNodes,
							]
						)
					)],
					ts.NodeFlags.Let
				)
			)
		]
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
			[value.joint]
		)
	}
}