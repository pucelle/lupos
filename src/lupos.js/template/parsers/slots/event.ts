import type TS from 'typescript'
import {SlotParserBase} from './base'
import {factory, Helper, Modifier, TemplateSlotPlaceholder, ts} from '../../../../base'
import {VariableNames} from '../variable-names'


export class EventSlotParser extends SlotParserBase {

	/** Event Name. */
	declare name: string

	/** For `@@comEvent`. */
	private forceComponentTargetType: boolean = false

	/** $latest_0 */
	private latestVariableName: string | null = null

	/** Indicates whether attach to target component or element. */
	private targetType: 'component' | 'element' = 'element'

	/** Whether be simulated events. */
	private beSimulatedEvents: boolean = false

	init() {
		if (this.name.startsWith('@')) {
			this.name = this.name.slice(1)
			this.forceComponentTargetType = TemplateSlotPlaceholder.isComponent(this.node.tagName!)
		}

		this.beSimulatedEvents = this.isSimulatedEvents()

		if (this.isValueMutable()) {
			this.latestVariableName = this.treeParser.getUniqueLatestName()
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

		let classDeclarations = [...this.resolveComponentDeclarations()]
		if (classDeclarations.length === 0) {
			return 'element'
		}

		for (let classDecl of classDeclarations) {
			let interfaceDecls = Helper.symbol.resolveExtendedInterfaceLikeTypeParameters(classDecl, 'EventFirer', 0)
			for (let decl of interfaceDecls) {
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

	outputInit() {
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
		let comVariableName = this.treeParser.getRefedComponentName(this.node)

		// $com_0.on('comEventName', eventHandler, $context)
		if (!this.isValueMutable() || this.isValueCanTurnStatic()) {
			return factory.createCallExpression(
				factory.createPropertyAccessExpression(
					factory.createIdentifier(comVariableName),
					factory.createIdentifier('on')
				),
				undefined,
				[
					factory.createStringLiteral(this.name),
					this.outputValue(),
					factory.createIdentifier(VariableNames.context)
				]
			)
		}

		// $com_0.on('comEventName', (...args) => {$latest_0.call($context, ...args)})
		else {
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
	}

	private outputLatestHandler(): TS.ArrowFunction {
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
						factory.createIdentifier(this.latestVariableName!),
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

		// DOMEvents.on($node_0, 'eventName', eventHandler, $context)
		if (!this.isValueMutable()) {
			return factory.createCallExpression(
				factory.createPropertyAccessExpression(
					factory.createIdentifier('SimulatedEvents'),
					factory.createIdentifier('on')
				),
				undefined,
				[
					factory.createIdentifier(nodeName),
					factory.createStringLiteral(this.name),
					this.outputValue(),
					factory.createIdentifier(VariableNames.context)
				]
			)
		}

		// DOMEvents.on($node_0, 'eventName', (...args) => {$latest_0.call($context, ...args)})
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
					this.outputLatestHandler()
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

		// DOMModifiableEvents.on($node_0, 'eventName', modifiers, eventHandler, $context)
		if (!this.isValueMutable()) {
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
					this.outputValue(),
					factory.createIdentifier(VariableNames.context)
				]
			)
		}

		// DOMModifiableEvents.on($node_0, 'eventName', modifiers, (...args) => {$latest_0.call($context, ...args)})
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
					this.outputLatestHandler()
				]
			)
		}
	}

	private outputElementInit() {
		let nodeName = this.getRefedNodeName()

		// $node_0.addEventListener('comEventName', eventHandler.bind($context))
		if (!this.isValueMutable()) {
			return factory.createCallExpression(
				factory.createPropertyAccessExpression(
					factory.createIdentifier(nodeName),
					factory.createIdentifier('addEventListener')
				),
				undefined,
				[
					factory.createStringLiteral(this.name),
					factory.createCallExpression(
						factory.createPropertyAccessExpression(
							this.outputValue(),
						  	factory.createIdentifier('bind')
						),
						undefined,
						[factory.createIdentifier(VariableNames.context)]
					)
				]
			)
		}

		// $node_0.addEventListener('comEventName', (...args) => {$latest_0.call($context, ...args)})
		else {
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
	}

	outputUpdate() {
		if (!this.isValueMutable()) {
			return []
		}

		return factory.createBinaryExpression(
			factory.createIdentifier(this.latestVariableName!),
			factory.createToken(ts.SyntaxKind.EqualsToken),
			this.outputValue()
		)
	}
}