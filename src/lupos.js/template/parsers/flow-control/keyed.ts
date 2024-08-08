import {factory, Modifier, ts} from '../../../../base'
import {FlowControlBase} from './base'
import {VariableNames} from '../variable-names'


export class KeyedFlowControl extends FlowControlBase {

	/** $block_0 */
	private blockVariableName: string = ''

	private cacheable: boolean = false
	private makerName: string | null = null
	private valueIndex: number | null = null

	init() {
		this.blockVariableName = this.tree.getUniqueBlockName()
		this.cacheable = this.hasAttrValue(this.node, 'cache')
		this.valueIndex = this.getAttrValueIndex(this.node)

		if (this.node.children.length > 0) {
			let tree = this.tree.separateChildrenAsSubTree(this.node)
			this.makerName = tree.getMakerRefName()
		}
	}

	outputInit() {
		let blockClassName = this.cacheable ? 'CacheableKeyedBlock' : 'KeyedBlock'
		Modifier.addImport(blockClassName, '@pucelle/lupos.js')

		// $block_0 = new KeyedBlock / CacheableKeyedBlock(
		//   maker,
		//   new TemplateSlot(new SlotPosition(SlotPositionType.Before, nextChild)),
		//   $context_0,
		// )

		let maker = this.outputMakerNode(this.makerName)
		let templateSlot = this.slot.makeTemplateSlot(null)

		return factory.createBinaryExpression(
			factory.createIdentifier(this.blockVariableName),
			factory.createToken(ts.SyntaxKind.EqualsToken),
			factory.createNewExpression(
				factory.createIdentifier(blockClassName),
				undefined,
				[
					maker,
					templateSlot,
					factory.createIdentifier(VariableNames.context),
				]
			)
		)
	}

	outputUpdate() {
		let keyedNode = this.valueIndex === null
			? factory.createNull()
			: this.slot.getOutputValueNodeAtIndex(this.valueIndex)

		// $block_0.update(newKey, $values)
		return factory.createCallExpression(
			factory.createPropertyAccessExpression(
				factory.createIdentifier(this.blockVariableName),
				factory.createIdentifier('update')
			),
			undefined,
			[
				keyedNode,
				factory.createIdentifier(VariableNames.values)
			]
		)
	}
}