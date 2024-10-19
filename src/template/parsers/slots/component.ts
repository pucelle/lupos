import type TS from 'typescript'
import {SlotParserBase} from './base'
import {factory, Modifier, ScopeTree, ts} from '../../../base'


export class ComponentSlotParser extends SlotParserBase {

	/** Nodes parameters for `new SlotRange(...)` */
	private slotRangeNodesGetter: (() => TS.Expression[]) | null = null

	preInit() {
		let comName = this.node.tagName!

		this.refAsComponent()

		let decl = ScopeTree.getDeclarationByName(comName, this.template.rawNode)
		if (!decl) {
			console.error(`Please make sure to import or declare "<${comName}>"!`)
			return
		}

		// Limit closest scope by referenced declaration.
		this.template.addRefedDeclaration(decl)

		// Avoid been removed by typescript compiler.
		if (ts.isImportSpecifier(decl)) {
			Modifier.persistImport(decl)
		}
	}

	postInit() {
		let hasRestSlotContentExisted = this.node.children.length > 0

		if (hasRestSlotContentExisted) {
			this.slotRangeNodesGetter = this.prepareNodesSlotRangeNodes()
		}
	}

	outputInit() {
		let nodeName = this.getRefedNodeName()
		let comName = this.node.tagName!
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

		return comInit
	}

	outputMoreInit() {
		let hasRestSlotContentExisted = this.node.children.length > 0

		// $com_0.__applyRestSlotNodes(startNode, endNode)
		if (hasRestSlotContentExisted) {
			let comVariableName = this.getRefedComponentName()
			let contentRangeNodes = this.slotRangeNodesGetter!()

			return factory.createCallExpression(
				factory.createPropertyAccessExpression(
					factory.createIdentifier(comVariableName),
					factory.createIdentifier('__applyRestSlotRangeNodes')
				),
				undefined,
				contentRangeNodes
			)  
		}

		return []
	}
}