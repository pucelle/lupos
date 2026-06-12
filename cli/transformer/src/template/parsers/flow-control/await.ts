import type ts from 'typescript'
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

	private templateName: string | null = null
	private promiseIndex: number | null = null

	override preInit() {
		this.blockVariableName = this.tree.makeUniqueBlockName()
		this.slotVariableName = this.slot.makeSlotName()

		let promiseIndex = this.getAttrValueIndex(this.node)
		let makerNode = this.node
		let templateName: string | null = null

		if (!makerNode || makerNode.children.length === 0) {
			templateName = null
		}
		else {

			// Separate as sub tree, not sub template.
			// So it generates all the values required to render all three branches.
			// Later inside AwaitBlock, it has no need to compute values after
			// promise state get changed.
			let tree = this.tree.separateChildrenAsSubTree(makerNode)

			templateName = tree.makeTemplateRefName()
		}

		this.promiseIndex = promiseIndex
		this.templateName = templateName
		this.templateSlotGetter = this.slot.prepareAsTemplateSlot(null)
	}

	override outputInit() {
		Modifier.addImport('AwaitBlock', 'lupos.html')

		// let $block_0 = new AwaitBlock(
		//   maker,
		//   new TemplateSlot(new SlotPosition(SlotPositionType.Before, nextChild)),
		//   $context_0,
		// )

		let maker = this.outputMakerNode(this.templateName)
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
						maker,
						factory.createIdentifier(this.slotVariableName),
						factory.createIdentifier(VariableNames.context)
					]
				)
			)
		]
	}

	override outputUpdate() {
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