import type TS from 'typescript'
import {factory, Modifier, ts} from '../../../../base'
import {FlowControlBase} from './base'
import {VariableNames} from '../variable-names'


export class ForFlowControl extends FlowControlBase {

	/** $block_0 */
	private blockVariableName: string = ''

	private ofValueIndex: number = -1
	private fnValueIndex: number = -1

	init() {
		this.blockVariableName = this.treeParser.getUniqueBlockName()

		let ofValueIndex = this.getAttrValueIndex(this.node)
		let fnValueIndex = this.getUniqueChildValueIndex(this.node)

		if (ofValueIndex === null) {
			throw new Error('<lupos:for ${...}> must accept a parameter as loop data!')
		}

		if (fnValueIndex === null) {
			throw new Error('<lupos:for>${...}</> must accept a parameter as child item renderer!')
		}

		this.ofValueIndex = ofValueIndex
		this.fnValueIndex = fnValueIndex
	}

	outputInit() {
		Modifier.addImport('ForBlock', '@pucelle/lupos.js')

		// $block_0 = new ForBlock(
		//   renderFn,
		//   new TemplateSlot(new SlotPosition(SlotPositionType.Before, nextChild)),
		//   $context_0,
		// )

		// Force render fn to be static.
		// So this render fn can't be like `a ? this.render1` : `this.render2`.
		let renderFnNode = this.template.values.outputValue(
			null, [this.fnValueIndex], true
		) as TS.FunctionExpression
		
		let templateSlot = this.slot.outputTemplateSlot(null)

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
		let ofNode = this.template.values.outputValue(null, [this.ofValueIndex])

		// $block_0.update($values[0])
		return factory.createCallExpression(
			factory.createPropertyAccessExpression(
				factory.createIdentifier(this.blockVariableName),
				factory.createIdentifier('update')
			),
			undefined,
			[
				ofNode,
			]
		)
	}
}