import ts from 'typescript'
import {SlotParserBase} from './base'
import {Modifier, Packer, transformContext} from '../../../core'
import {TemplateSlotPlaceholder} from '../../../lupos-ts-module'


export class PropertySlotParser extends SlotParserBase {

	/** Property Name. */
	declare name: string

	/** For `..comProperty`. */
	private forceComponentTargetType: boolean = false

	/** $latest_0 */
	private latestVariableNames: (string | null)[] | null = null

	/** Indicates whether attach to target component or element. */
	private targetType: 'component' | 'element' = 'element'

	override preInit() {
		if (this.prefix === '..') {
			this.forceComponentTargetType = TemplateSlotPlaceholder.isComponent(this.node.tagName!)
		}

		if (this.isAnyValueCantTransfer()) {
			this.latestVariableNames = this.makeGroupOfLatestNames()
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

		let classDeclarations = [...this.template.resolveComponentDeclarations(this.node.tagName!)]
		if (classDeclarations.length === 0) {
			return 'element'
		}

		for (let classDecl of classDeclarations) {
			let interfaceAndClassDecls = transformContext.helper.symbol.resolveChainedObjectLike(classDecl)

			for (let decl of interfaceAndClassDecls) {
				for (let member of decl.members) {
					if (!member.name) {
						continue
					}

					if (transformContext.helper.getFullText(member.name) === this.name) {
						return 'component'
					}
				}
			}
		}

		return 'element'
	}

	override outputUpdate() {
		let target: ts.Identifier
		let comVariableName = this.getRefedComponentName()!

		// trackSet
		if (this.targetType === 'component' && this.latestVariableNames) {
			Modifier.addImport('trackSet', 'lupos')
		}

		// $com_0
		if (this.targetType === 'component') {
			target = transformContext.factory.createIdentifier(comVariableName)
		}

		// $node_0
		else {
			target = transformContext.factory.createIdentifier(this.getRefedNodeName())
		}

		// $values[0]
		let value = this.outputValue()

		// trackSet($com_0, property)
		let setTracking = this.targetType === 'component' && this.latestVariableNames
			? [transformContext.factory.createCallExpression(
				transformContext.factory.createIdentifier("trackSet"),
				undefined,
				[
					transformContext.factory.createIdentifier(this.getRefedComponentName()!),
					transformContext.factory.createStringLiteral(this.name),
				]
			)]
			: []

		// if ($latest_0 !== $values[0]) {
		//   target[propertyName] = $values[0]
		//   $latest_0 = $values[0]
		// }
		if (this.latestVariableNames) {
			return transformContext.factory.createIfStatement(
				this.outputLatestComparison(this.latestVariableNames, value.valueNodes),
				transformContext.factory.createBlock(
					[
						transformContext.factory.createExpressionStatement(transformContext.factory.createBinaryExpression(
							transformContext.factory.createPropertyAccessExpression(
								target,
								transformContext.factory.createIdentifier(this.name)
							),
							transformContext.factory.createToken(ts.SyntaxKind.EqualsToken),
							value.joint
						)),
						...this.outputLatestAssignments(this.latestVariableNames, value.valueNodes),
						...Packer.toStatements(setTracking),
					],
					true
				),
				undefined
			)
		}

		// target[propertyName] = $values[0]
		else {
			return transformContext.factory.createBinaryExpression(
				transformContext.factory.createPropertyAccessExpression(
					target,
					transformContext.factory.createIdentifier(this.name)
				),
				transformContext.factory.createToken(ts.SyntaxKind.EqualsToken),
				value.joint
			)
		}
	}

	outputSetTracking(): {name: string, property: string}[] {
		if (this.targetType === 'component') {
			return [{
				name: this.getRefedComponentName()!,
				property: this.name,
			}]
		}
		else {
			return []
		}
	}
}