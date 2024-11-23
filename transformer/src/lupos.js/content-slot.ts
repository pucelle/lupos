import type TS from 'typescript'
import {defineVisitor, ts, Modifier, factory} from '../core'
import {Helper} from '../lupos-ts-module'
import {SlotContentType} from '../enums'


defineVisitor(function(node: TS.Node, _index: number) {
	if (!ts.isClassDeclaration(node)) {
		return
	}

	// Be a component.
	if (!Helper.cls.isDerivedOf(node, 'Component', '@pucelle/lupos.js')) {
		return
	}

	// Must not specify `ContentSlotType: ...` itself.
	let contentSlotProperty = Helper.cls.getProperty(node, 'ContentSlotType')
	if (contentSlotProperty && contentSlotProperty.modifiers?.some(m => m.kind === ts.SyntaxKind.StaticKeyword)) {
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
	let slotType: SlotContentType | null = null

	// Check Slot Type.
	if (typeText === 'TemplateResult') {
		slotType = SlotContentType.TemplateResult
	}
	else if (typeText === 'TemplateResult[]') {
		slotType = SlotContentType.TemplateResultList
	}
	else if (typeText === 'string' || typeText === 'number'
		|| Helper.types.isNonNullableValueType(renderType)
	) {
		slotType = SlotContentType.Text
	}
	else if (/^(?:\w*?Element|Node|Comment|Text)$/.test(typeText)) {
		slotType = SlotContentType.Node
	}

	// Add a property `static SlotContentType = SlotContentType.xxx`.
	if (slotType !== null) {
		let property = factory.createPropertyDeclaration(
			[
				factory.createToken(ts.SyntaxKind.StaticKeyword)
			],
			factory.createIdentifier('SlotContentType'),
			undefined,
			undefined,
			factory.createNumericLiteral(slotType)
		)

		Modifier.addClassMember(node, property, true)
	}
})
