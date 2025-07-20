import * as ts from 'typescript'
import {factory, Interpolator} from '../../../core'
import {IfFlowControl} from './if'


export class SwitchFlowControl extends IfFlowControl {

	private switchValueIndex: number | null = null

	preInit() {
		let switchValueIndex = this.getAttrValueIndex(this.node)
		this.switchValueIndex = switchValueIndex
		
		let childNodes = this.node.children
		this.initByNodesAndTags(childNodes)
		this.node.empty()
	}

	outputInit() {
		if (this.switchValueIndex === null) {
			return []
		}

		let blockClassName = this.cacheable ? 'CacheableSwitchBlock' : 'SwitchBlock'
		return this.outputInitByBlockClassName(blockClassName)
	}

	outputUpdate() {
		if (this.switchValueIndex === null) {
			return []
		}

		// $block_0.update($values[0])
		return super.outputUpdate()
	}

	protected outputConditionsExps() {
		let switchValue = this.switchValueIndex !== null
			? this.template.values.getRawValue(this.switchValueIndex)
			: factory.createNull()

		let conditions = this.conditionIndices.map(index => {
			if (index === null) {
				return factory.createNull()
			}
			else {
				let rawNode = this.template.values.getRawValue(index)

				return factory.createBinaryExpression(
					switchValue,
					factory.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken),
					Interpolator.outputUniqueSelf(rawNode) as ts.Expression
				)
			}
		})

		return conditions
	}
}