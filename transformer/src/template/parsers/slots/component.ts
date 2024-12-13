import * as ts from 'typescript'
import {SlotParserBase} from './base'
import {factory, Modifier, VariableScopeTree} from '../../../core'


export class ComponentSlotParser extends SlotParserBase {

	/** Nodes parameters for `new SlotRange(...)` */
	private slotRangeNodesGetter: (() => ts.Expression[]) | null = null

	preInit() {
		let comName = this.node.tagName!

		this.refAsComponent()

		let decl = VariableScopeTree.getReferenceByName(comName, this.template.node)
		if (decl) {
			// Limit closest scope by referenced declaration.
			this.template.addRefedDeclaration(decl)

			// Avoid been removed by typescript compiler.
			if (ts.isImportSpecifier(decl)) {
				Modifier.persistImport(decl)
			}
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

		// let $com_0 = new Com($node_0), after component has been referenced.
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