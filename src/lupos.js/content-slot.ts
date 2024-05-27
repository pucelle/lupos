import type ts from 'typescript'
import {SourceFileModifier, TSHelper, defineVisitor} from '../base'


defineVisitor(

	// Be derived class of `Component`.
	// May switch to match `render` method?
	(node: ts.Node, helper: TSHelper) => {
		if (!helper.ts.isClassDeclaration(node)) {
			return false
		}

		// Be a component.
		return helper.isDerivedClassOf(node, 'Component', '@pucelle/lupos.js')
	},
	(node: ts.ClassDeclaration, modifier: SourceFileModifier) => {
		let helper = modifier.helper

		// Must not specify `ContentSlotType: ...` itself.
		let contentSlotProperty = helper.getClassProperty(node, 'ContentSlotType')
		if (contentSlotProperty) {
			return node
		}

		// Must specify `render(): ...`
		let renderMethod = helper.getClassMethod(node, 'render')
		if (!renderMethod) {
			return node
		}

		let renderType = helper.getNodeReturnType(renderMethod)
		if (!renderType) {
			return node
		}

		let factory = helper.ts.factory
		let typeText = helper.getTypeFullText(renderType)
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
			modifier.addNamedImport('SlotContentType', '@pucelle/lupos.js')

			let property = factory.createPropertyDeclaration(
				[
					factory.createToken(helper.ts.SyntaxKind.StaticKeyword)
				],
				factory.createIdentifier('ContentSlotType'),
				undefined,
				undefined,
				factory.createPropertyAccessExpression(
					factory.createIdentifier('SlotContentType'),
					factory.createIdentifier(slotType)
				)
			)

			return modifier.addClassMembers(node, [property], true)	  
		}

		return node
	},
)
