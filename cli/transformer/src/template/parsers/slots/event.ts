import ts from 'typescript'
import {SlotParserBase} from './base'
import {Modifier, transformContext} from '../../../core'
import {TemplateSlotPlaceholder} from '../../../lupos-ts-module'
import {PartType} from '../tree'


export class EventSlotParser extends SlotParserBase {

	/** Event Name. */
	declare name: string

	/** Whether output update content as a lazy callback. */
	override asLazyCallback: boolean = true

	/** For `@@comEvent`. */
	private forceComponentTargetType: boolean = false

	/** $latest_0 */
	private latestVariableNames: (string | null)[] | null = null

	/** $binding_0 */
	private bindingVariableName: string | null = null

	/** Indicates whether attach to target component or element. */
	private targetType: 'component' | 'element' = 'element'

	override preInit() {
		if (this.prefix === '@@') {
			this.forceComponentTargetType = TemplateSlotPlaceholder.isComponent(this.node.tagName!)
		}

		// Will try to turn event handler to be static handler.
		if (this.isAnyValueCantTransfer()) {
			this.latestVariableNames = this.makeGroupOfLatestNames()
		}

		this.targetType = this.checkTargetType()

		if (this.targetType === 'component') {
			this.refAsComponent()
		}
		else {
			this.bindingVariableName = this.tree.makeUniqueBindingName()
			this.tree.addPart(this.bindingVariableName, this.node, PartType.Binding)
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
			let interfaceDecls = transformContext.helper.symbol.resolveSpecifiedTypeParameter(classDecl, 'EventFirer', 0)
			
			for (let decl of interfaceDecls) {
				for (let member of decl.members) {
					if (!member.name) {
						continue
					}

					if (transformContext.helper.getText(member.name) === this.name) {
						return 'component'
					}
				}
			}
		}

		return	'element'
	}

	override outputMoreInit() {
		if (this.targetType === 'component') {
			return this.outputComponentInit()
		}
		else {
			return this.outputOnBindingInit()
		}
	}

	private outputComponentInit() {
		let comVariableName = this.tree.getRefedComponentName(this.node)!

		// $com_0.on('comEventName', (...args) => {$latest_0.call($context, ...args)})
		if (this.latestVariableNames) {
			return transformContext.factory.createCallExpression(
				transformContext.factory.createPropertyAccessExpression(
					transformContext.factory.createIdentifier(comVariableName),
					transformContext.factory.createIdentifier('on')
				),
				undefined,
				[
					transformContext.factory.createStringLiteral(this.name),
					this.outputLatestHandler()
				]
			)
		}

		// $com_0.on('comEventName', eventHandler, $context)
		else {
			return transformContext.factory.createCallExpression(
				transformContext.factory.createPropertyAccessExpression(
					transformContext.factory.createIdentifier(comVariableName),
					transformContext.factory.createIdentifier('on')
				),
				undefined,
				[
					transformContext.factory.createStringLiteral(this.name),
					this.outputValue().joint,
					this.tree.createContextIdentifier()
				]
			)
		}
	}

	private outputLatestHandler(): ts.ArrowFunction {

		// (...args) => {$latest_0.call($context, ...args)}
		return transformContext.factory.createArrowFunction(
			undefined,
			undefined,
			[transformContext.factory.createParameterDeclaration(
				undefined,
				transformContext.factory.createToken(ts.SyntaxKind.DotDotDotToken),
				transformContext.factory.createIdentifier('args'),
				undefined,
				undefined,
				undefined
			)],
			undefined,
			transformContext.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
			transformContext.factory.createBlock(
				[transformContext.factory.createExpressionStatement(transformContext.factory.createCallExpression(
					transformContext.factory.createPropertyAccessExpression(
						transformContext.factory.createIdentifier(this.latestVariableNames![0]!),
						transformContext.factory.createIdentifier('call')
					),
					undefined,
					[
						this.tree.createContextIdentifier(),
						transformContext.factory.createSpreadElement(transformContext.factory.createIdentifier('args'))
					]
				))],
				true
			)
		)
	}

	private outputOnBindingInit() {
		Modifier.addImport('on', 'lupos.html')

		let node = transformContext.factory.createIdentifier(this.getRefedNodeName())
		let type = transformContext.factory.createStringLiteral(this.name)
		let handler = this.latestVariableNames ? this.outputLatestHandler() : this.outputValue().joint

		let modifiers = this.modifiers && this.modifiers.length > 0
			? transformContext.factory.createArrayLiteralExpression(
				this.modifiers.map(m => transformContext.factory.createStringLiteral(m)),
				false
			)
			: null

		// new on($node_0, $context)
		let newBinding = transformContext.factory.createNewExpression(
			transformContext.factory.createIdentifier('on'),
			undefined,
			[
				node,
				this.tree.createContextIdentifier(),
			]
		)

		let bindingInit = this.createVariableAssignment(
			this.bindingVariableName!,
			newBinding
		)

		let bindingUpdate = transformContext.factory.createCallExpression(
			transformContext.factory.createPropertyAccessExpression(
				transformContext.factory.createIdentifier(this.bindingVariableName!),
				transformContext.factory.createIdentifier('update')
			),
			undefined,
			[
				type,
				handler,
				...(modifiers ? [transformContext.factory.createIdentifier('undefined'), modifiers] : [])
			]
		)

		return [
			bindingInit,
			bindingUpdate,
		]
	}

	override outputUpdate() {
		if (this.latestVariableNames) {
			return transformContext.factory.createBinaryExpression(
				transformContext.factory.createIdentifier(this.latestVariableNames[0]!),
				transformContext.factory.createToken(ts.SyntaxKind.EqualsToken),
				this.outputValue().joint
			)
		}

		return []
	}
}
