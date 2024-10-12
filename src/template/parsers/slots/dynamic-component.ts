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

	/** new TemplateSlot(...) */
	private templateSlotGetter!: () => TS.Expression

	/** Nodes parameters for `new SlotRange(...)` */
	private slotRangeNodesGetter: (() => TS.Expression[]) | null = null

	init() {
		let hasContentExisted = this.node.children.length > 0

		this.refAsComponent()
		this.blockVariableName = this.tree.makeUniqueBlockName()
		this.slotVariableName = this.makeSlotName()
		this.templateSlotGetter = this.prepareTemplateSlot(null)

		if (hasContentExisted) {
			Modifier.addImport('SlotRange', '@pucelle/lupos.js')
			this.slotRangeNodesGetter = this.prepareNodesSlotRangeNodes()
		}
	}

	/** Get node name and position parameters for outputting template slot. */
	protected prepareTemplateSlotParameters() {
		let position = SlotPositionType.Before
		let nextNode = this.node.nextSibling
		let useNode: HTMLNode

		// Use next node to locate.
		if (nextNode && nextNode.isPrecedingPositionStable()) {
			useNode = nextNode
		}

		// Use current node to locate.
		else {
			let comment = new HTMLNode(HTMLNodeType.Comment, {})
			this.node.after(comment)
			useNode = comment
		}

		this.tree.references.ref(useNode)

		return () => {
			let nodeName = this.tree.references.getRefedName(useNode)

			return {
				nodeName,
				position
			}
		}
	}

	outputInit(nodeAttrInits: TS.Statement[]) {
		Modifier.addImport('DynamicComponentBlock', '@pucelle/lupos.js')

		let hasNodeRefed = this.hasNodeRefed()
		let nodeName = this.getRefedNodeName()
		let comName = this.getRefedComponentName()
		let hasContentExisted = this.node.children.length > 0

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


		// new TemplateSlot(...)
		let templateSlot = this.templateSlotGetter()

		// Must not pre-declare.
		let slotInit = this.createVariableAssignment(
			this.slotVariableName,
			templateSlot,
			false
		)


		// new SlotRange(...)
		let contentRange = hasContentExisted ? [factory.createNewExpression(
			factory.createIdentifier('SlotRange'),
			undefined,
			this.slotRangeNodesGetter!()
		)] : []
		
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
								...contentRange
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