import {factory, Modifier, ts} from '../../../../base'
import {FlowControlBase} from './base'
import {VariableNames} from '../variable-names'


export class AwaitFlowControl extends FlowControlBase {

	/** $block_0 */
	private blockVariableName: string = ''

	private makerNames: (string | null)[] = []
	private promiseIndex: number = -1

	init() {
		this.blockVariableName = this.tree.getUniqueBlockName()

		let promiseIndex = this.getAttrValueIndex(this.node)
		if (promiseIndex === null) {
			throw new Error('<lupos:await ${...}> must accept a parameter as promise to await!')
		}

		let nextNodes = this.eatNext('lupos:then', 'lupos:catch')
		let allNodes = [this.node, ...nextNodes]
		let makerNames: (string | null)[] = []
	
		for (let node of allNodes) {
			if (node.children.length > 0) {
				let tree = this.tree.separateChildrenAsSubTree(node)
				let makerName = tree.getMakerRefName()
				makerNames.push(makerName)
			}
			else {
				makerNames.push(null)
			}
		}

		this.promiseIndex = promiseIndex
		this.makerNames = makerNames
	}

	outputInit() {
		Modifier.addImport('AwaitBlock', '@pucelle/lupos.js')

		// $block_0 = new AwaitBlock(
		//   makers,
		//   new TemplateSlot(new SlotPosition(SlotPositionType.Before, nextChild)),
		//   $context_0,
		// )

		let makers = this.outputMakerNodes(this.makerNames)
		let templateSlot = this.slot.makeTemplateSlotNode(null)

		return factory.createBinaryExpression(
			factory.createIdentifier(this.blockVariableName),
			factory.createToken(ts.SyntaxKind.EqualsToken),
			factory.createNewExpression(
				factory.createIdentifier('AwaitBlock'),
				undefined,
				[
					makers,
					templateSlot,
					factory.createIdentifier(VariableNames.context),
				]
			)
		)
	}

	outputUpdate() {
		// This promise may be static, ignore it.
		let promiseNode = this.template.values.outputValueNodeAt(this.promiseIndex)

		// $block_0.update(promise, $values)
		return factory.createCallExpression(
			factory.createPropertyAccessExpression(
				factory.createIdentifier(this.blockVariableName),
				factory.createIdentifier('update')
			),
			undefined,
			[
				promiseNode,
				factory.createIdentifier(VariableNames.values)
			]
		)
	}
}