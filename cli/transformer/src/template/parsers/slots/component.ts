import * as ts from 'typescript'
import {SlotParserBase} from './base'
import {factory, Modifier, DeclarationScopeTree} from '../../../core'


export class ComponentSlotParser extends SlotParserBase {

	/** Nodes parameters for `new SlotRange(...)` */
	private slotRangeNodesGetter: (() => ts.Expression[]) | null = null

	override preInit() {
		let comName = this.node.tagName!
		this.refAsComponent()

		let decl = DeclarationScopeTree.getReferenceByName(comName, this.template.node)
		if (decl) {

			// Limit closest scope by referenced declaration.
			this.template.addRefedDeclaration(decl)

			// Avoid been removed by typescript compiler.
			if (ts.isImportSpecifier(decl)) {
				Modifier.persistImport(decl)
			}
		}
	}

	override postInit() {
		let hasRestSlotContentExisted = this.node.children.length > 0

		if (hasRestSlotContentExisted) {
			this.slotRangeNodesGetter = this.prepareNodesSlotRangeNodes()
		}
	}

	override outputInit() {
		let nodeName = this.getRefedNodeName()
		let comName = this.node.tagName!
		let comVariableName = this.getRefedComponentName()!

		// `let $com_0 = new Com($node_0)`, after component node has been referenced.
		let comInit = this.createVariableAssignment(
			comVariableName,
			factory.createNewExpression(
				factory.createIdentifier(comName),
				undefined,
				[
					factory.createIdentifier(nodeName)
				]
			)
		)

		return comInit
	}

	override outputMoreInit() {
		let hasRestSlotContentExisted = this.node.children.length > 0

		// $com_0.$setRestSlotNodes(startNode, endNode)
		if (hasRestSlotContentExisted) {
			let comVariableName = this.getRefedComponentName()!
			let contentRangeNodes = this.slotRangeNodesGetter!()

			return factory.createCallExpression(
				factory.createPropertyAccessExpression(
					factory.createIdentifier(comVariableName),
					factory.createIdentifier('$setRestSlotRangeNodes')
				),
				undefined,
				contentRangeNodes
			)  
		}

		return []
	}
}