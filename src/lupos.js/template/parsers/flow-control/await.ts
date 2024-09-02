import {factory, Modifier, ts} from '../../../../base'
import {FlowControlBase} from './base'
import {VariableNames} from '../variable-names'


export class AwaitFlowControl extends FlowControlBase {

	/** $block_0 */
	private blockVariableName: string = ''

	private templateNames: (string | null)[] = []
	private promiseIndex: number = -1

	init() {
		this.blockVariableName = this.treeParser.getUniqueBlockName()

		let promiseIndex = this.getAttrValueIndex(this.node)
		if (promiseIndex === null) {
			throw new Error('<lupos:await ${...}> must accept a parameter as promise to await!')
		}

		let nextNodes = this.eatNext('lupos:then', 'lupos:catch')
		let thenNode = nextNodes.find(n => n.tagName === 'lupos:then')
		let catchNode = nextNodes.find(n => n.tagName === 'lupos:catch')
		let allNodes = [this.node, thenNode, catchNode]
		let templateNames: (string | null)[] = []

		for (let node of allNodes) {
			if (!node || node.children.length === 0) {
				templateNames.push(null)
			}
			else {
				let tree = this.treeParser.separateChildrenAsSubTree(node)
				let templateName = tree.getTemplateRefName()
				templateNames.push(templateName)
			}
		}

		this.promiseIndex = promiseIndex
		this.templateNames = templateNames
	}

	outputInit() {
		Modifier.addImport('AwaitBlock', '@pucelle/lupos.js')

		// $block_0 = new AwaitBlock(
		//   makers,
		//   new TemplateSlot(new SlotPosition(SlotPositionType.Before, nextChild)),
		//   $context_0,
		// )

		let makers = this.outputMakerNodes(this.templateNames)
		let templateSlot = this.slot.outputTemplateSlot(null)

		return factory.createBinaryExpression(
			factory.createIdentifier(this.blockVariableName),
			factory.createToken(ts.SyntaxKind.EqualsToken),
			factory.createNewExpression(
				factory.createIdentifier('AwaitBlock'),
				undefined,
				[
					makers,
					templateSlot,
				]
			)
		)
	}

	outputUpdate() {
		// This promise may be static, will still update each time.
		let promiseNode = this.template.values.outputValue(null, [this.promiseIndex])

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