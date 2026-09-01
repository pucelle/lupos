import ts from 'typescript'
import {defineVisitor, Modifier, transformContext} from '../core'
import {SlotContentType} from '../enums'


defineVisitor(ts.SyntaxKind.ClassDeclaration, function(node: ts.ClassDeclaration) {

	// Be a component.
	if (!transformContext.helper.objectLike.isDerivedOf(node, 'Component', 'lupos.html')) {
		return
	}

	// Must not specify `ContentSlotType: ...` itself.
	let contentSlotProperty = transformContext.helper.class.getProperty(node, 'ContentSlotType', false)
	if (contentSlotProperty && contentSlotProperty.modifiers?.some(m => m.kind === ts.SyntaxKind.StaticKeyword)) {
		return
	}

	// Must specify `render(): ...`
	let renderMethod = transformContext.helper.class.getMethod(node, 'render', false)
	if (!renderMethod) {
		return
	}

	let renderType = transformContext.helper.types.getReturnTypeOfSignature(renderMethod)
	if (!renderType) {
		return
	}

	let typeText = transformContext.helper.types.getTypeFullText(renderType)
	let slotType: SlotContentType | null = null

	// Check Slot Type.
	if (typeText === 'TemplateResult') {
		slotType = SlotContentType.TemplateResult
	}
	else if (typeText === 'TemplateResult[]') {
		slotType = SlotContentType.TemplateResultList
	}
	else if (typeText === 'string' || typeText === 'number'
		|| transformContext.helper.types.isNonNullableValueType(renderType)
	) {
		slotType = SlotContentType.Text
	}
	else if (/^(?:\w*?Element|Node|Comment|Text)$/.test(typeText)) {
		slotType = SlotContentType.Node
	}

	// Add a property `static SlotContentType = SlotContentType.xxx`.
	if (slotType !== null) {
		let property = transformContext.factory.createPropertyDeclaration(
			[
				transformContext.factory.createToken(ts.SyntaxKind.StaticKeyword)
			],
			transformContext.factory.createIdentifier('SlotContentType'),
			undefined,
			undefined,
			transformContext.factory.createNumericLiteral(slotType)
		)

		Modifier.addClassMember(node, property, true)
	}
})
