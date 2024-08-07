import type TS from 'typescript'
import {SlotBase} from './base'
import {factory, ts} from '../../../../base'


export class ComponentSlot extends SlotBase {

	init() {
		let hasRestSlotContentExisted = this.node.children.length > 0
		if (hasRestSlotContentExisted) {
			this.refAsComponent()
		}
	}

	outputInit(nodeOtherInits: TS.Statement[]) {
		let nodeName = this.getRefedNodeName()
		let ComName = this.node.tagName!
		let componentReferenced = this.isRefedAsComponent()
		let hasRestSlotContentExisted = this.node.children.length > 0
		let comInit: TS.Expression
		let restSlotRangeInit: TS.Expression | null = null


		// new Com($node_0), 
		let newCom = factory.createNewExpression(
			factory.createIdentifier(ComName),
			undefined,
			[factory.createIdentifier(nodeName)]
		)

		// $com_0 = new Com($node_0), after component has been referenced.
		if (componentReferenced) {
			let comVariableName = this.getRefedComponentName()

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


		// $com_0.__applyRestSlotRange(
		//   new SlotRange(startNode, endNode)
		// )
		if (hasRestSlotContentExisted) {
			let comVariableName = this.getRefedComponentName()
			let contentRange = this.makeSlotRangeExpression()

			restSlotRangeInit = factory.createCallExpression(
				factory.createPropertyAccessExpression(
					factory.createIdentifier(comVariableName),
					factory.createIdentifier('__applyRestSlotRange')
				),
				undefined,
				[contentRange]
			)			  
		}
		

		return [
			comInit,
			restSlotRangeInit,
			...nodeOtherInits,
		].filter(v => v) as TS.Expression[]
	}
}