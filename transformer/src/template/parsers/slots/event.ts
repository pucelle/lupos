import * as ts from 'typescript'
import {SlotParserBase} from './base'
import {factory, Modifier, helper} from '../../../core'
import {VariableNames} from '../variable-names'
import {TemplateSlotPlaceholder} from '../../../lupos-ts-module'


export class EventSlotParser extends SlotParserBase {

	/** Event Name. */
	declare name: string

	/** Whether output update content as a lazy callback. */
	asLazyCallback: boolean = true

	/** For `@@comEvent`. */
	private forceComponentTargetType: boolean = false

	/** $latest_0 */
	private latestVariableNames: (string | null)[] | null = null

	/** Indicates whether attach to target component or element. */
	private targetType: 'component' | 'element' = 'element'

	/** Whether be simulated events. */
	private beSimulatedEvents: boolean = false

	preInit() {
		if (this.prefix === '@@') {
			this.forceComponentTargetType = TemplateSlotPlaceholder.isComponent(this.node.tagName!)
		}

		this.beSimulatedEvents = this.isSimulatedEvents()

		// Will try to turn event handler to be static.
		if (!this.isAllValuesCanTransfer()) {
			this.latestVariableNames = this.makeGroupOfLatestNames()
		}

		this.targetType = this.checkTargetType()

		if (this.targetType === 'component') {
			this.refAsComponent()
		}
	}

	private isSimulatedEvents(): boolean {
		let groupName = this.name.replace(/:.+/, '')

		return [
			'tap',
			'double-tap',
			'hold',
			'pinch-transform',
			'pinch-zoom',
			'slide',
		].includes(groupName)
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
			let interfaceDecls = helper.symbol.resolveExtendedInterfaceLikeTypeParameters(classDecl, 'EventFirer', 0)
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

	outputMoreInit() {
		if (this.targetType === 'component') {
			return this.outputComponentInit()
		}
		else if (this.beSimulatedEvents) {
			return this.outputSimulatedInit()
		}
		else if (this.modifiers!.length > 0) {
			return this.outputModifiableInit()
		}
		else {
			return this.outputElementInit()
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

	private outputSimulatedInit() {
		Modifier.addImport('SimulatedEvents', '@pucelle/ff')

		let nodeName = this.getRefedNodeName()

		// DOMEvents.on($node_0, 'eventName', (...args) => {$latest_0.call($context, ...args)})
		if (this.latestVariableNames) {
			return factory.createCallExpression(
				factory.createPropertyAccessExpression(
					factory.createIdentifier('SimulatedEvents'),
					factory.createIdentifier('on')
				),
				undefined,
				[
					factory.createIdentifier(nodeName),
					factory.createStringLiteral(this.name),
					this.outputLatestHandler()
				]
			)
		}

		// DOMEvents.on($node_0, 'eventName', eventHandler, $context)
		else {
			return factory.createCallExpression(
				factory.createPropertyAccessExpression(
					factory.createIdentifier('SimulatedEvents'),
					factory.createIdentifier('on')
				),
				undefined,
				[
					factory.createIdentifier(nodeName),
					factory.createStringLiteral(this.name),
					this.outputValue().joint,
					factory.createIdentifier(VariableNames.context)
				]
			)
		}
	}

	private outputModifiableInit() {
		Modifier.addImport('DOMModifiableEvents', '@pucelle/ff')

		let nodeName = this.getRefedNodeName()

		let modifiers = factory.createArrayLiteralExpression(
			this.modifiers!.map(m => factory.createStringLiteral(m)),
			false
		)

		// DOMModifiableEvents.on($node_0, 'eventName', modifiers, (...args) => {$latest_0.call($context, ...args)})
		if (this.latestVariableNames) {
			return factory.createCallExpression(
				factory.createPropertyAccessExpression(
					factory.createIdentifier('DOMModifiableEvents'),
					factory.createIdentifier('on')
				),
				undefined,
				[
					factory.createIdentifier(nodeName),
					factory.createStringLiteral(this.name),
					modifiers,
					this.outputLatestHandler()
				]
			)
		}

		// DOMModifiableEvents.on($node_0, 'eventName', modifiers, eventHandler, $context)
		else {
			return factory.createCallExpression(
				factory.createPropertyAccessExpression(
					factory.createIdentifier('DOMModifiableEvents'),
					factory.createIdentifier('on')
				),
				undefined,
				[
					factory.createIdentifier(nodeName),
					factory.createStringLiteral(this.name),
					modifiers,
					this.outputValue().joint,
					factory.createIdentifier(VariableNames.context)
				]
			)
		}
	}

	private outputElementInit() {
		let nodeName = this.getRefedNodeName()

		// $node_0.addEventListener('comEventName', (...args) => {$latest_0.call($context, ...args)})
		if (this.isAnyValueCantTransfer()) {
			return factory.createCallExpression(
				factory.createPropertyAccessExpression(
					factory.createIdentifier(nodeName),
					factory.createIdentifier('addEventListener')
				),
				undefined,
				[
					factory.createStringLiteral(this.name),
					this.outputLatestHandler()
				]
			)
		}

		// $node_0.addEventListener('comEventName', eventHandler.bind($context))
		else {
			let eventHandler = this.outputValue().joint
			let shouldBindContext = this.shouldBindEventHandler(eventHandler)

			// bind with current context.
			if (shouldBindContext) {
				eventHandler = factory.createCallExpression(
					factory.createPropertyAccessExpression(
						this.outputValue().joint,
						factory.createIdentifier('bind')
					),
					undefined,
					[factory.createIdentifier(VariableNames.context)]
				)
			}

			return factory.createCallExpression(
				factory.createPropertyAccessExpression(
					factory.createIdentifier(nodeName),
					factory.createIdentifier('addEventListener')
				),
				undefined,
				[
					factory.createStringLiteral(this.name),
					eventHandler
				]
			)
		}
	}

	private shouldBindEventHandler(event: ts.Expression): boolean {

		// Already a function declaration, `this` will be replaced to `$context`.
		if (helper.isFunctionLike(event)) {
			return false
		}

		// `a.bind(xxx)`
		let hasBound = ts.isCallExpression(event)
			&& ts.isPropertyAccessExpression(event.expression)
			&& helper.getText(event.expression.name) === 'bind'

		
		if (hasBound) {
			return false
		}

		// Otherwise must bind.
		return true
	}

	outputUpdate() {
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