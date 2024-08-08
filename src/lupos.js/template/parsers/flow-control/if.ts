import type TS from 'typescript'
import {factory, Modifier, ts} from '../../../../base'
import {FlowControlBase} from './base'
import {VariableNames} from '../variable-names'


export class IfFlowControl extends FlowControlBase {

	/** $block_0 */
	private blockVariableName: string = ''

	private cacheable: boolean = false
	private valueIndices: (number | null)[] = []
	private makerNames: (string | null)[] = []

	init() {
		this.blockVariableName = this.tree.getUniqueBlockName()
		this.cacheable = this.hasAttrValue(this.node, 'cache')

		let nextNodes = this.eatNext('lupos:elseif', 'lupos:else')
		let allNodes = [this.node, ...nextNodes]
		let valueIndices: (number | null)[] = []
		let makerNames: (string | null)[] = []

		for (let node of allNodes) {
			let valueIndex = this.getAttrValueIndex(node)
			valueIndices.push(valueIndex)
	
			if (node.children.length > 0) {
				let tree = this.tree.separateChildrenAsSubTree(node)
				let makerName = tree.getMakerRefName()
				makerNames.push(makerName)
			}
			else {
				makerNames.push(null)
			}

			if (node.tagName === 'lupos:else' || valueIndex === null) {
				break
			}
		}

		this.makerNames = makerNames
		this.valueIndices = valueIndices
	}

	outputInit() {
		let blockClassName = this.cacheable ? 'CacheableIfBlock' : 'IfBlock'
		Modifier.addImport(blockClassName, '@pucelle/lupos.js')

		// $block_0 = new IfBlock / CacheableIfBlock(
		//   indexFn,
		//   makers,
		//   new TemplateSlot(new SlotPosition(SlotPositionType.Before, nextChild)),
		//   $context_0,
		// )

		let indexFn = this.outputIfIndexFn(this.valueIndices)
		let makers = this.outputMakerNodes(this.makerNames)
		let templateSlot = this.slot.makeTemplateSlot(null)

		return factory.createBinaryExpression(
			factory.createIdentifier(this.blockVariableName),
			factory.createToken(ts.SyntaxKind.EqualsToken),
			factory.createNewExpression(
				factory.createIdentifier(blockClassName),
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

	/** Make an index output function by an if condition value index sequence. */
	private outputIfIndexFn(valueIndices: (number | null)[]): TS.FunctionExpression {
		let hasElse = valueIndices[valueIndices.length - 1] === null
		let elseIndex = hasElse ? valueIndices.length - 1 : -1

		// Always build else branch.
		let elseNode: TS.Statement = factory.createBlock(
			[factory.createReturnStatement(factory.createNumericLiteral(elseIndex))],
			true
		)

		for (let i = hasElse ? valueIndices.length - 2 : valueIndices.length - 1; i >= 0; i--) {
			let valueIndex = valueIndices[i]!
			let conditionNode = this.slot.getOutputValueNodeAtIndex(valueIndex)

			let thenNode = factory.createBlock(
				[factory.createReturnStatement(factory.createNumericLiteral(i))],
				true
			)

			elseNode = factory.createIfStatement(
				conditionNode,
				thenNode,
				elseNode
			)
		}

		return factory.createFunctionExpression(
			undefined,
			undefined,
			undefined,
			undefined,
			[factory.createParameterDeclaration(
				undefined,
				undefined,
				factory.createIdentifier(VariableNames.values),
				undefined,
				undefined,
				undefined
			)],
			undefined,
			factory.createBlock(
				[elseNode],
				true
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