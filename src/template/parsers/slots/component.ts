import type TS from 'typescript'
import {SlotParserBase} from './base'
import {factory, Modifier, ScopeTree, ts} from '../../../base'
import {cleanList} from '../../../utils'


export class ComponentSlotParser extends SlotParserBase {

	/** new SlotRange(...) */
	private slotRangeGetter: (() => TS.Expression) | null = null

	init() {
		let comName = this.node.tagName!
		let hasRestSlotContentExisted = this.node.children.length > 0

		this.refAsComponent()

		let decl = ScopeTree.getDeclarationByName(comName, this.template.rawNode)
		if (!decl) {
			throw new Error(`Please make sure to import or declare "<${comName}>"!`)
		}

		// Limit closest scope by referenced declaration.
		this.template.addRefedDeclaration(decl)

		// Avoid been removed by typescript compiler.
		if (ts.isImportSpecifier(decl)) {
			Modifier.persistImport(decl)
		}

		if (hasRestSlotContentExisted) {
			this.slotRangeGetter = this.prepareSlotRange()
		}
	}

	outputInit() {
		let nodeName = this.getRefedNodeName()
		let comName = this.node.tagName!
		let hasRestSlotContentExisted = this.node.children.length > 0
		let restSlotRangeInit: TS.Expression | null = null
		let comVariableName = this.getRefedComponentName()

		// let $com_0 = new Com({}, $node_0), after component has been referenced.
		let comInit = this.createVariableAssignment(
			comVariableName,
			factory.createNewExpression(
				factory.createIdentifier(comName),
				undefined,
				[
					factory.createObjectLiteralExpression(
						[],
						false
					),
					factory.createIdentifier(nodeName)
				]
			)
		)

		// $com_0.__applyRestSlotRange(
		//   new SlotRange(startNode, endNode)
		// )
		if (hasRestSlotContentExisted) {
			let comVariableName = this.getRefedComponentName()
			let contentRange = this.slotRangeGetter!()

			restSlotRangeInit = factory.createCallExpression(
				factory.createPropertyAccessExpression(
					factory.createIdentifier(comVariableName),
					factory.createIdentifier('__applyRestSlotRange')
				),
				undefined,
				[contentRange]
			)  
		}

		return cleanList([
			comInit,
			restSlotRangeInit,
		])
	}
}