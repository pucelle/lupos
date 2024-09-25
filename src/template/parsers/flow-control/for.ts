import type TS from 'typescript'
import {factory, Modifier} from '../../../base'
import {FlowControlBase} from './base'
import {SlotContentType} from '../../../enums'


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
			throw new Error('<lu:for ${...}> must accept a parameter as loop data!')
		}

		if (fnValueIndex === null) {
			throw new Error('<lu:for>${...}</> must accept a parameter as child item renderer!')
		}

		this.ofValueIndex = ofValueIndex
		this.fnValueIndex = fnValueIndex

		// Remove child slot.
		this.node.empty()
	}

	outputInit() {
		Modifier.addImport('ForBlock', '@pucelle/lupos.js')

		// let $block_0 = new ForBlock(
		//   renderFn,
		//   new TemplateSlot(new SlotPosition(SlotPositionType.Before, nextChild)),
		//   $context_0,
		// )

		// Force render fn to be static.
		// So this render fn can't be like `a ? this.render1` : `this.render2`.
		let renderFnNode = this.template.values.outputValue(
			null,
			[this.fnValueIndex],
			true
		) as TS.FunctionExpression
		
		let templateSlot = this.slot.outputTemplateSlot(SlotContentType.TemplateResultList)

		return this.slot.addVariableAssignment(
			this.blockVariableName,
			factory.createNewExpression(
				factory.createIdentifier('ForBlock'),
				undefined,
				[
					renderFnNode,
					templateSlot,
				]
			)
		)
	}

	outputUpdate() {
		let ofNode = this.template.values.outputValue(null, [this.ofValueIndex])

		// $block_0.update(data)
		// may be data is static, will still update each time
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