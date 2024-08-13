import type TS from 'typescript'
import {factory, Modifier, ts} from '../../../../base'
import {FlowControlBase} from './base'
import {VariableNames} from '../variable-names'


export class IfFlowControl extends FlowControlBase {

	/** $block_0 */
	private blockVariableName: string = ''

	private cacheable: boolean = false
	private valueIndices: (number | null)[] = []
	private templateNames: (string | null)[] = []

	init() {
		this.blockVariableName = this.treeParser.getUniqueBlockName()
		this.cacheable = this.hasAttrValue(this.node, 'cache')

		let nextNodes = this.eatNext('lupos:elseif', 'lupos:else')
		let allNodes = [this.node, ...nextNodes]
		let valueIndices: (number | null)[] = []
		let templateNames: (string | null)[] = []

		for (let node of allNodes) {
			let valueIndex = this.getAttrValueIndex(node)
			
			if (valueIndex === null && node.tagName !== 'lupos:else') {
				throw new Error('<' + node.tagName + ' ${...}> must accept a parameter as condition!')
			}

			if (valueIndex !== null && node.tagName === 'lupos:else') {
				throw new Error('<' + node.tagName + '> should not accept any parameter!')
			}

			if (valueIndex === null && valueIndices[valueIndices.length - 1] === null) {
				throw new Error('<lupos:else> is allowed only one to exist on the tail!')
			}

			valueIndices.push(valueIndex)
	
			if (node.children.length > 0) {
				let tree = this.treeParser.separateChildrenAsSubTree(node)
				let temName = tree.getTemplateRefName()
				templateNames.push(temName)
			}
			else {
				templateNames.push(null)
			}
		}

		this.templateNames = templateNames
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
		let makers = this.outputMakerNodes(this.templateNames)
		let templateSlot = this.slot.outputTemplateSlotNode(null)

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
			let conditionNode = this.template.values.outputNodeAt(valueIndex)

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