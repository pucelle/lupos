import type TS from 'typescript'
import {SlotParserBase} from './base'
import {factory, Helper, Imports, TemplateSlotPlaceholder, ts, typeChecker} from '../../../../base'


export class PropertySlotParser extends SlotParserBase {

	/** Property Name. */
	declare name: string

	/** $latest_0 */
	private latestVariableName: string | null = null

	/** Indicates whether attach to target component or element. */
	private targetType: 'component' | 'element' = 'element'

	init() {
		if (this.isValueMutable()) {
			this.latestVariableName = this.tree.getUniqueLatestName()
		}

		this.targetType = this.checkTargetType()

		if (this.targetType === 'component') {
			this.refAsComponent()
		}
	}

	private checkTargetType(): 'component' | 'element' {
		let tagName = this.node.tagName!
		let isComponent = /^[A-Z]/.test(tagName)
		let isDynamicComponent = TemplateSlotPlaceholder.isCompleteSlotIndex(tagName)

		if (isComponent || isDynamicComponent) {
			let com: TS.Node | undefined
			if (isComponent) {
				com = Imports.getImportByName(tagName)
			}
			else {
				com = this.getRawNode()
			}

			if (!com) {
				return 'element'
			}

			let comType = Helper.types.getType(com)

			// Directly query for declaration member at type.
			let propertyDeclType = typeChecker.getPropertyOfType(comType, this.name!)
			if (!propertyDeclType) {
				return 'element'
			}

			if (!Helper.symbol.resolveDeclarationBySymbol(propertyDeclType, ts.isPropertyDeclaration)) {
				return 'element'
			}

			return 'component'
		}

		return  'element'
	}

	outputUpdate() {
		let target: TS.Identifier

		// $com_0
		if (this.targetType === 'component') {
			target = factory.createIdentifier(this.getRefedComponentName())
		}

		// $node_0
		else {
			target = factory.createIdentifier(this.getRefedNodeName())
		}

		// $values[0]
		let value = this.outputValueNode()

		// $latest_0 === $values[0] && target[propertyName] = $latest_0 = $values[0]
		if (this.latestVariableName) {
			return factory.createBinaryExpression(
				factory.createBinaryExpression(
					factory.createIdentifier(this.latestVariableName),
					factory.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken),
					value
				),
				factory.createToken(ts.SyntaxKind.AmpersandAmpersandToken),
				factory.createBinaryExpression(
					factory.createPropertyAccessExpression(
						target,
						factory.createIdentifier(this.name)
					),
					factory.createToken(ts.SyntaxKind.EqualsToken),
					factory.createBinaryExpression(
						factory.createIdentifier(this.latestVariableName),
						factory.createToken(ts.SyntaxKind.EqualsToken),
						value
					)
				),
			)
		}

		// target[propertyName] = $values[0]
		else {
			return factory.createBinaryExpression(
				factory.createPropertyAccessExpression(
					target,
					factory.createIdentifier(this.name)
				),
				factory.createToken(ts.SyntaxKind.EqualsToken),
				value
			)
		}
	}
}