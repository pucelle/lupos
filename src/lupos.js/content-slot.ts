import type TS from 'typescript'
import {helper, defineVisitor, ts, modifier, factory} from '../base'


defineVisitor(function(node: TS.Node, index: number) {
	if (!ts.isClassDeclaration(node)) {
		return
	}

	// Be a component.
	if (!helper.cls.isDerivedOf(node, 'Component', '@pucelle/lupos.js')) {
		return
	}

	// Must not specify `ContentSlotType: ...` itself.
	let contentSlotProperty = helper.cls.getProperty(node, 'ContentSlotType')
	if (contentSlotProperty) {
		return
	}

	// Must specify `render(): ...`
	let renderMethod = helper.cls.getMethod(node, 'render')
	if (!renderMethod) {
		return
	}

	let renderType = helper.types.getReturnType(renderMethod)
	if (!renderType) {
		return
	}

	let typeText = helper.types.getTypeFullText(renderType)
	let slotType: 'TemplateResult' | 'TemplateResultArray' | 'Text' | null = null

	// Check Slot Type.
	if (renderType.isUnion()) {}
	else if (typeText === 'TemplateResult') {
		slotType = 'TemplateResult'
	}
	else if (typeText === 'TemplateResult[]') {
		slotType = 'TemplateResultArray'
	}
	else if (typeText === 'string' || typeText === 'number') {
		slotType = 'Text'
	}

	// Add a property `static ContentSlotType = SlotContentType.xxx`.
	if (slotType) {
		modifier.addImport('SlotContentType', '@pucelle/lupos.js')

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

		modifier.addClassMember(index, property, true)
	}
})
