import type TS from 'typescript'
import {SlotBase} from './base'
import {factory, ts} from '../../../../base'


export class ComponentSlot extends SlotBase {

	outputInit() {
		let nodeName = this.tree.references.getReferenceName(this.node)
		let ComName = this.node.tagName!
		let componentReferenced = this.tree.isComponentReferenced(this.node)
		let hasContentExisted = this.node.children.length > 0
		let comInit: TS.Expression
		let restSlotRangeInit: TS.Expression

		// new Com($node_0), 
		let newCom = factory.createNewExpression(
			factory.createIdentifier(ComName),
			undefined,
			[factory.createIdentifier(nodeName)]
		)

		// $com_0.__applyRestSlotRange(
		//   new SlotRange(
		//     new SlotPosition(SlotPositionType.Before, text),
		//     text)
		// )
		// 
		if (hasContentExisted) {
			
		}

		let p = new SlotPosition<SlotPositionType.Before>(SlotPositionType.Before, text)
		let r = new SlotRange(p, text)
		child.__applyRestSlotRange(r)

		// $com_0 = new Com($node_0), after component has been referenced.
		if (componentReferenced || hasContentExisted) {
			let comVariableName = this.tree.getRefedComponentName(this.node)!

			comInit = factory.createBinaryExpression(
				factory.createIdentifier(comVariableName),
				factory.createToken(ts.SyntaxKind.EqualsToken),
				newCom
			)
		}

		// new Com($node_0)
		else {
			comInit = newCom
		}
	}
}