import ts from 'typescript'
import {SlotParserBase} from './base'
import {Modifier, transformContext} from '../../../core'
import {HTMLNode, HTMLNodeType} from '../../../lupos-ts-module'
import {SlotPositionType} from '../../../enums'
import {HTMLNodeHelper, PrecedingPositionStability} from '../../html-syntax'


export class DynamicComponentSlotParser extends SlotParserBase {

	/** $block_0 */
	private blockVariableName: string = ''

	/** $slot_0 */
	private slotVariableName: string = ''

	/** new TemplateSlot(...) */
	private templateSlotGetter!: () => ts.Expression

	/** Nodes parameters for `new SlotRange(...)` */
	private slotRangeNodesGetter: (() => ts.Expression[]) | null = null

	override preInit() {
		this.blockVariableName = this.tree.makeUniqueBlockName()
		this.slotVariableName = this.makeSlotName()
		this.templateSlotGetter = this.prepareAsTemplateSlot(null)
	}

	override postInit() {
		let hasContentExisted = this.node.children.length > 0

		if (hasContentExisted) {
			Modifier.addImport('SlotRange', 'lupos.html')
			this.slotRangeNodesGetter = this.prepareNodesSlotRangeNodes()
		}
	}

	protected override prepareTemplateSlotParametersGetter() {
		let position = SlotPositionType.Before
		let nextNode = this.node.nextSibling
		let useNode: HTMLNode

		// Use next node to locate.
		// Use next node as template slot position, but will not remove current node.
		if (nextNode
			&& !this.node.markerId
			&& HTMLNodeHelper.getPrecedingPositionStability(nextNode, this.template.values.valueNodes)
				=== PrecedingPositionStability.Stable
		) {
			useNode = nextNode
			HTMLNodeHelper.willInsertContentsBefore(nextNode)
		}

		// Use a comment node as template slot position, but will not remove current node.
		else {

			// No need to generate finger print for it because will not add more contents before.
			let comment = new HTMLNode(HTMLNodeType.Comment, -1, -1)
			this.node.after(comment)
			useNode = comment
		}

		this.tree.references.needRef(useNode)

		return () => {
			let nodeName = this.tree.references.getRefedName(useNode)

			return {
				nodeName,
				fingerPrintId: useNode.markerId,
				position
			}
		}
	}

	override outputInit(nodeAttrInits: ts.Statement[]) {
		Modifier.addImport('DynamicComponentBlock', 'lupos.html')

		let hasNodeRefed = this.hasNodeRefed()
		let nodeName = this.getRefedNodeName()
		let comName = this.getRefedComponentName()
		let hasContentExisted = this.node.children.length > 0

		// let $com_0
		if (comName) {
			this.tree.addPreDeclaredVariableName(comName)
		}

		// let $block_0 = new DynamicComponentBlock(
		//   function(com){
		//     $node_0 = com.el;
		//	   $com_0 = com;
		//	   ...nodeAttrInits
		//   },
		//   new TemplateSlot(new SlotPosition(SlotPositionType.Before, nextChild)),
		//   new SlotRange() / null
		// )

		let binderFn = transformContext.factory.createFunctionExpression(
			undefined,
			undefined,
			transformContext.factory.createIdentifier(''),
			undefined,
			[transformContext.factory.createParameterDeclaration(
				undefined,
				undefined,
				transformContext.factory.createIdentifier('com'),
				undefined,
				undefined,
				undefined
			)],
			undefined,
			transformContext.factory.createBlock(
				[
					...(hasNodeRefed ? [transformContext.factory.createExpressionStatement(transformContext.factory.createBinaryExpression(
						transformContext.factory.createIdentifier(nodeName),
						transformContext.factory.createToken(ts.SyntaxKind.EqualsToken),
						transformContext.factory.createPropertyAccessExpression(transformContext.factory.createIdentifier('com'), 'el')
					))] : []),
					...(comName ? [transformContext.factory.createExpressionStatement(transformContext.factory.createBinaryExpression(
						transformContext.factory.createIdentifier(comName),
						transformContext.factory.createToken(ts.SyntaxKind.EqualsToken),
						transformContext.factory.createIdentifier('com')
					))] : []),
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
		let contentRange = hasContentExisted ? [transformContext.factory.createNewExpression(
			transformContext.factory.createIdentifier('SlotRange'),
			undefined,
			this.slotRangeNodesGetter!()
		)] : []
		
		return [
			slotInit,
			transformContext.factory.createVariableStatement(
				undefined,
				transformContext.factory.createVariableDeclarationList(
					[transformContext.factory.createVariableDeclaration(
						transformContext.factory.createIdentifier(this.blockVariableName),
						undefined,
						undefined,
						transformContext.factory.createNewExpression(
							transformContext.factory.createIdentifier('DynamicComponentBlock'),
							undefined,
							[
								binderFn,
								transformContext.factory.createIdentifier(nodeName),
								transformContext.factory.createIdentifier(this.slotVariableName),
								...contentRange
							]
						)
					)],
					ts.NodeFlags.Let
				)
			)
		]
	}

	override outputUpdate() {
		let value = this.outputValue()

		// $block_0.update($values[0])
		return transformContext.factory.createCallExpression(
			transformContext.factory.createPropertyAccessExpression(
				transformContext.factory.createIdentifier(this.blockVariableName),
				transformContext.factory.createIdentifier('update')
			),
			undefined,
			[value.joint]
		)
	}
}