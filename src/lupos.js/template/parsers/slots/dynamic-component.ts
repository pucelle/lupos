import {SlotBase} from './base'
import {factory, modifier, ts} from '../../../../base'


export class DynamicComponentSlot extends SlotBase {

	/** $com_0 */
	private comVariableName: string = ''

	/** $block_0 */
	private blockVariableName: string = ''

	init() {
		this.comVariableName = this.tree.refComponent(this.node)
		this.blockVariableName = this.tree.getUniqueBlockVariableName()
	}

	outputInit() {
		modifier.addImport('DynamicComponentBlock', '@pucelle/lupos.js')

		let nodeName = this.tree.references.getReferenceName(this.node)
		let ComName = this.node.tagName!

		// $com_0 = new Com($node_0)
		let comNew = factory.createNewExpression(
			factory.createIdentifier(ComName),
			undefined,
			[factory.createIdentifier(nodeName)]
		)

		// $block_0 = new DynamicComponentBlock($node_0), after component has been referenced.
		if (this.tree.isComponentReferenced(this.node)) {
			let comName = this.tree.refComponent(this.node)

			return factory.createBinaryExpression(
				factory.createIdentifier(comName),
				factory.createToken(ts.SyntaxKind.EqualsToken),
				comNew
			)
		}
		else {
			return comNew
		}
	}
}