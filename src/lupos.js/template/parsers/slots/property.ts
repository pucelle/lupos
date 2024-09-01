import type TS from 'typescript'
import {SlotParserBase} from './base'
import {factory, Helper, TemplateSlotPlaceholder, ts} from '../../../../base'


export class PropertySlotParser extends SlotParserBase {

	/** Property Name. */
	declare name: string

	/** For `..comProperty`. */
	private forceComponentTargetType: boolean = false

	/** $latest_0 */
	private latestVariableName: string | null = null

	/** Indicates whether attach to target component or element. */
	private targetType: 'component' | 'element' = 'element'

	init() {
		if (this.name.startsWith('.')) {
			this.name = this.name.slice(1)
			this.forceComponentTargetType = TemplateSlotPlaceholder.isComponent(this.node.tagName!)
		}

		if (this.isValueMutable()) {
			this.latestVariableName = this.treeParser.getUniqueLatestName()
		}

		this.targetType = this.checkTargetType()

		if (this.targetType === 'component') {
			this.refAsComponent()
		}
	}

	private checkTargetType(): 'component' | 'element' {
		if (this.forceComponentTargetType) {
			return 'component'
		}

		let classDeclarations = [...this.resolveComponentDeclarations()]
		if (classDeclarations.length === 0) {
			return 'element'
		}

		for (let classDecl of classDeclarations) {

			let interfaceAndClassDecls = Helper.symbol.resolveChainedClassesAndInterfaces(classDecl)

			for (let decl of interfaceAndClassDecls) {
				for (let member of decl.members) {
					if (!member.name) {
						continue
					}

					if (Helper.getText(member.name) === this.name) {
						return 'component'
					}
				}
			}
		}

		return	'element'
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
		let value = this.outputValue()

		// if ($latest_0 !== $values[0]) {
		//   target[propertyName] = $latest_0 = $values[0]
		// }
		if (this.latestVariableName) {
			return factory.createIfStatement(
				factory.createBinaryExpression(
					factory.createIdentifier(this.latestVariableName),
					factory.createToken(ts.SyntaxKind.ExclamationEqualsEqualsToken),
					value
				),
				factory.createBlock(
					[
						factory.createExpressionStatement(factory.createBinaryExpression(
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
						))
					],
					true
				),
				undefined
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