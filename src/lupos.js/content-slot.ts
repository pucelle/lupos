import type TS from 'typescript'
import {Helper, defineVisitor, ts, Modifier, factory} from '../base'


defineVisitor(function(node: TS.Node, index: number) {
	if (!ts.isClassDeclaration(node)) {
		return
	}

	// Be a component.
	if (!Helper.cls.isDerivedOf(node, 'Component', '@pucelle/lupos.js')) {
		return
	}

	// Must not specify `ContentSlotType: ...` itself.
	let contentSlotProperty = Helper.cls.getProperty(node, 'ContentSlotType')
	if (contentSlotProperty) {
		return
	}

	// Must specify `render(): ...`
	let renderMethod = Helper.cls.getMethod(node, 'render')
	if (!renderMethod) {
		return
	}

	let renderType = Helper.types.getReturnType(renderMethod)
	if (!renderType) {
		return
	}

	let typeText = Helper.types.getTypeFullText(renderType)
	let slotType: 'TemplateResult' | 'TemplateResultList' | 'Text' | 'Node' | null = null

	// Check Slot Type.
	if (typeText === 'TemplateResult') {
		slotType = 'TemplateResult'
	}
	else if (typeText === 'TemplateResult[]') {
		slotType = 'TemplateResultList'
	}
	else if (typeText === 'string' || typeText === 'number'
		|| Helper.types.isNonNullableValueType(renderType)
	) {
		slotType = 'Text'
	}
	else if (/^\w*?(Node|Element)$/.test(typeText)) {
		slotType = 'Node'
	}

	// Add a property `static ContentSlotType = SlotContentType.xxx`.
	if (slotType) {
		Modifier.addImport('SlotContentType', '@pucelle/lupos.js')

		let property = factory.createPropertyDeclaration(
			[
				factory.createToken(ts.SyntaxKind.StaticKeyword)
			],
			factory.createIdentifier('ContentSlotType'),
			undefined,
			undefined,
			factory.createPropertyAccessExpression(
				factory.createIdentifier('SlotContentType'),
				factory.createIdentifier(slotType)
			)
		)

		Modifier.addClassMember(index, property, true)
	}
})
