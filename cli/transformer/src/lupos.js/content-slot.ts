import * as ts from 'typescript'
import {defineVisitor, Modifier, factory, helper} from '../core'
import {SlotContentType} from '../enums'


defineVisitor(function(node: ts.Node) {
	if (!ts.isClassDeclaration(node)) {
		return
	}

	// Be a component.
	if (!helper.objectLike.isDerivedOf(node, 'Component', 'lupos.html')) {
		return
	}

	// Must not specify `ContentSlotType: ...` itself.
	let contentSlotProperty = helper.class.getProperty(node, 'ContentSlotType', false)
	if (contentSlotProperty && contentSlotProperty.modifiers?.some(m => m.kind === ts.SyntaxKind.StaticKeyword)) {
		return
	}

	// Must specify `render(): ...`
	let renderMethod = helper.class.getMethod(node, 'render', false)
	if (!renderMethod) {
		return
	}

	let renderType = helper.types.getReturnTypeOfSignature(renderMethod)
	if (!renderType) {
		return
	}

	let typeText = helper.types.getTypeFullText(renderType)
	let slotType: SlotContentType | null = null

	// Check Slot Type.
	if (typeText === 'TemplateResult') {
		slotType = SlotContentType.TemplateResult
	}
	else if (typeText === 'TemplateResult[]') {
		slotType = SlotContentType.TemplateResultList
	}
	else if (typeText === 'string' || typeText === 'number'
		|| helper.types.isNonNullableValueType(renderType)
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
