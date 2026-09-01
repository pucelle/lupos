import ts from 'typescript'
import {SlotParserBase} from './base'
import {Modifier, DeclarationScopeTree, transformContext} from '../../../core'


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
			transformContext.factory.createNewExpression(
				transformContext.factory.createIdentifier(comName),
				undefined,
				[
					transformContext.factory.createIdentifier(nodeName)
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

			return transformContext.factory.createCallExpression(
				transformContext.factory.createPropertyAccessExpression(
					transformContext.factory.createIdentifier(comVariableName),
					transformContext.factory.createIdentifier('$setRestSlotRangeNodes')
				),
				undefined,
				contentRangeNodes
			)  
		}

		return []
	}
}