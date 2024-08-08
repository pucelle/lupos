import {factory, modifier, ts} from '../../../../base'
import {FlowControlBase} from './base'
import {VariableNames} from '../variable-names'


export class ForFlowControl extends FlowControlBase {

	/** $block_0 */
	private blockVariableName: string = ''

	private ofValueIndex: number | null = null
	private fnValueIndex: number | null = null
	private fnValueStatic: boolean = false

	init() {
		this.blockVariableName = this.tree.getUniqueBlockName()
		this.ofValueIndex = this.getAttrValueIndex(this.node)
		this.fnValueIndex = this.getUniqueChildValueIndex(this.node)
		this.fnValueStatic = this.fnValueIndex !== null ? this.slot.isValueAtIndexMutable(this.fnValueIndex) : true
	}

	outputInit() {
		modifier.addImport('ForBlock', '@pucelle/lupos.js')

		// $block_0 = new ForBlock(
		//   renderFn,
		//   new TemplateSlot(new SlotPosition(SlotPositionType.Before, nextChild)),
		//   $context_0,
		// )

		let renderFn = this.outputIfIndexFn(this.valueIndices)
		let makers = this.outputMakerNodes(this.makerNames)
		let templateSlot = this.slot.makeTemplateSlot(null)

		return factory.createBinaryExpression(
			factory.createIdentifier(this.blockVariableName),
			factory.createToken(ts.SyntaxKind.EqualsToken),
			factory.createNewExpression(
				factory.createIdentifier('ForBlock'),
				undefined,
				[
					indexFn,
					makers,
					templateSlot,
					factory.createIdentifier(VariableNames.context),
				]
			)
		)
	}

	outputUpdate() {

		// $block_0.update($values)
		return factory.createCallExpression(
			factory.createPropertyAccessExpression(
				factory.createIdentifier(this.blockVariableName),
				factory.createIdentifier('update')
			),
			undefined,
			[
				factory.createIdentifier(VariableNames.values)
			]
		)
	}
}