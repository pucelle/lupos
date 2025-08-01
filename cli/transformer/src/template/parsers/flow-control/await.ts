import type * as ts from 'typescript'
import {factory, Modifier} from '../../../core'
import {FlowControlBase} from './base'
import {VariableNames} from '../variable-names'
import {TemplatePartType} from '../../../lupos-ts-module'


export class AwaitFlowControl extends FlowControlBase {

	/** $block_0 */
	private blockVariableName: string = ''

	/** $slot_0 */
	private slotVariableName: string = ''

	/** new TemplateSlot(...) */
	private templateSlotGetter!: () => ts.Expression

	private templateNames: (string | null)[] = []
	private promiseIndex: number | null = null

	preInit() {
		this.blockVariableName = this.tree.makeUniqueBlockName()
		this.slotVariableName = this.slot.makeSlotName()

		let promiseIndex = this.getAttrValueIndex(this.node)
		let nextNodes = this.eatNext('lu:then', 'lu:catch')
		let thenNode = nextNodes.find(n => n.tagName === 'lu:then')
		let catchNode = nextNodes.find(n => n.tagName === 'lu:catch')
		let allNodes = [this.node, thenNode, catchNode]
		let templateNames: (string | null)[] = []

		for (let node of allNodes) {
			if (!node || node.children.length === 0) {
				templateNames.push(null)
			}
			else {

				// Separate as sub tree, not sub template.
				// So it generates all the values required to render all three branches.
				// Later inside AwaitBlock, it has no need to compute values after
				// promise state get changed.
				let tree = this.tree.separateChildrenAsSubTree(node)

				let templateName = tree.makeTemplateRefName()
				templateNames.push(templateName)
			}
		}

		this.promiseIndex = promiseIndex
		this.templateNames = templateNames
		this.templateSlotGetter = this.slot.prepareAsTemplateSlot(null)
	}

	outputInit() {
		Modifier.addImport('AwaitBlock', '@pucelle/lupos.js')

		// let $block_0 = new AwaitBlock(
		//   makers,
		//   new TemplateSlot(new SlotPosition(SlotPositionType.Before, nextChild)),
		//   $context_0,
		// )

		let makers = this.outputMakerNodes(this.templateNames)
		let templateSlot = this.templateSlotGetter()

		let slotInit = this.slot.createVariableAssignment(
			this.slotVariableName,
			templateSlot
		)

		return [
			slotInit,
			this.slot.createVariableAssignment(
				this.blockVariableName,
				factory.createNewExpression(
					factory.createIdentifier('AwaitBlock'),
					undefined,
					[
						makers,
						factory.createIdentifier(this.slotVariableName),
						factory.createIdentifier(VariableNames.context)
					]
				)
			)
		]
	}

	outputUpdate() {
		// This promise may be static, will still update each time.
		let valueIndices = this.promiseIndex !== null ? [this.promiseIndex] : null
		let promiseNode = this.template.values.outputValue(null, valueIndices, this.tree, this.asLazyCallback, TemplatePartType.FlowControl).joint

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