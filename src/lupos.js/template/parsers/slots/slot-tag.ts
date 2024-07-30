import type TS from 'typescript'
import {HTMLTreeParser} from '../html-tree'
import {SlotBase} from './base'
import {factory} from '../../../../base'
import {VariableNames} from '../variable-names'


export class SlotTagSlot extends SlotBase {

	private defaultContentParser: HTMLTreeParser | null = null
	private namedValueIndex: number | null = null

	parse() {

		if (this.name) {
			let value = factory.createCallExpression(
				factory.createPropertyAccessExpression(
				factory.createIdentifier(VariableNames.context),
				factory.createIdentifier('__getSlotElement')
				),
				undefined,
				[factory.createStringLiteral(this.name)]
			)

			this.namedValueIndex = this.tree.template.addCustomizedValue(value)
		}

		// Slot default content.
		if (this.node.children.length > 0) {
			this.defaultContentParser = this.tree.separateSubTree(this.node)
		}
	}

	outputInit(): TS.Statement[] {
		if (this.name) {

		}

		let nodeIndex = this.tree.references.getReferenceIndex(this.node)
		let valueIndex = this.tree.template.getRemappedValueIndex()
	}

	outputUpdate(): TS.Statement[] {
		if (this.namedValueIndex !== null) {
			let valueIndex = this.tree.template.getRemappedValueIndex(this.namedValueIndex)

			return 
		}
		
		let nodeIndex = this.tree.references.getReferenceIndex(this.node)
		let valueIndex = this.tree.template.getRemappedValueIndex()
	}
}