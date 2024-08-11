import type TS from 'typescript'
import {factory, Modifier, ts} from '../../../../base'
import {FlowControlBase} from './base'
import {VariableNames} from '../variable-names'


export class ForFlowControl extends FlowControlBase {

	/** $block_0 */
	private blockVariableName: string = ''

	private ofValueIndex: number | null = null
	private fnValueIndex: number | null = null

	init() {
		this.blockVariableName = this.tree.getUniqueBlockName()
		this.ofValueIndex = this.getAttrValueIndex(this.node)
		this.fnValueIndex = this.getUniqueChildValueIndex(this.node)
	}

	outputInit() {
		if (this.ofValueIndex === null || this.fnValueIndex === null) {
			return []
		}

		Modifier.addImport('ForBlock', '@pucelle/lupos.js')

		// $block_0 = new ForBlock(
		//   renderFn,
		//   new TemplateSlot(new SlotPosition(SlotPositionType.Before, nextChild)),
		//   $context_0,
		// )

		// Force render fn to be static.
		// So this render fn cant be like `a ? this.render1` : `this.render2`.
		let renderFnNode = this.template.values.outputValueNodeAt(this.fnValueIndex, true) as TS.FunctionExpression
		let templateSlot = this.slot.makeTemplateSlot(null)

		return factory.createBinaryExpression(
			factory.createIdentifier(this.blockVariableName),
			factory.createToken(ts.SyntaxKind.EqualsToken),
			factory.createNewExpression(
				factory.createIdentifier('ForBlock'),
				undefined,
				[
					renderFnNode,
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