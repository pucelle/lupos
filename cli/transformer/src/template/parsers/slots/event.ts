import ts from 'typescript'
import {SlotParserBase} from './base'
import {factory, Modifier, helper} from '../../../core'
import {VariableNames} from '../variable-names'
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
			let interfaceDecls = helper.symbol.resolveSpecifiedTypeParameter(classDecl, 'EventFirer', 0)
			
			for (let decl of interfaceDecls) {
				for (let member of decl.members) {
					if (!member.name) {
						continue
					}

					if (helper.getText(member.name) === this.name) {
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
			return factory.createCallExpression(
				factory.createPropertyAccessExpression(
					factory.createIdentifier(comVariableName),
					factory.createIdentifier('on')
				),
				undefined,
				[
					factory.createStringLiteral(this.name),
					this.outputLatestHandler()
				]
			)
		}

		// $com_0.on('comEventName', eventHandler, $context)
		else {
			return factory.createCallExpression(
				factory.createPropertyAccessExpression(
					factory.createIdentifier(comVariableName),
					factory.createIdentifier('on')
				),
				undefined,
				[
					factory.createStringLiteral(this.name),
					this.outputValue().joint,
					factory.createIdentifier(VariableNames.context)
				]
			)
		}
	}

	private outputLatestHandler(): ts.ArrowFunction {

		// (...args) => {$latest_0.call($context, ...args)}
		return factory.createArrowFunction(
			undefined,
			undefined,
			[factory.createParameterDeclaration(
				undefined,
				factory.createToken(ts.SyntaxKind.DotDotDotToken),
				factory.createIdentifier('args'),
				undefined,
				undefined,
				undefined
			)],
			undefined,
			factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
			factory.createBlock(
				[factory.createExpressionStatement(factory.createCallExpression(
					factory.createPropertyAccessExpression(
						factory.createIdentifier(this.latestVariableNames![0]!),
						factory.createIdentifier('call')
					),
					undefined,
					[
						factory.createIdentifier(VariableNames.context),
						factory.createSpreadElement(factory.createIdentifier('args'))
					]
				))],
				true
			)
		)
	}

	private outputOnBindingInit() {
		Modifier.addImport('on', 'lupos.html')

		let node = factory.createIdentifier(this.getRefedNodeName())
		let type = factory.createStringLiteral(this.name)
		let handler = this.latestVariableNames ? this.outputLatestHandler() : this.outputValue().joint

		let modifiers = this.modifiers && this.modifiers.length > 0
			? factory.createArrayLiteralExpression(
				this.modifiers.map(m => factory.createStringLiteral(m)),
				false
			)
			: null

		// new on($node_0, $context)
		let newBinding = factory.createNewExpression(
			factory.createIdentifier('on'),
			undefined,
			[
				node,
				factory.createIdentifier(VariableNames.context),
			]
		)

		let bindingInit = this.createVariableAssignment(
			this.bindingVariableName!,
			newBinding
		)

		let bindingUpdate = factory.createCallExpression(
			factory.createPropertyAccessExpression(
				factory.createIdentifier(this.bindingVariableName!),
				factory.createIdentifier('update')
			),
			undefined,
			[
				type,
				handler,
				...(modifiers ? [factory.createIdentifier('undefined'), modifiers] : [])
			]
		)

		return [
			bindingInit,
			bindingUpdate,
		]
	}

	override outputUpdate() {
		if (this.latestVariableNames) {
			return factory.createBinaryExpression(
				factory.createIdentifier(this.latestVariableNames[0]!),
				factory.createToken(ts.SyntaxKind.EqualsToken),
				this.outputValue().joint
			)
		}

		return []
	}
}