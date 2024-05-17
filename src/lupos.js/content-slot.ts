import type * as ts from 'typescript'
import {SourceFileModifier, TSHelper, defineVisitor, isComponent} from '../base'


defineVisitor(

	// Be derived class of `Component`.
	// May switch to match `render` method?
	(node: ts.Node, helper: TSHelper) => {
		if (!helper.ts.isClassDeclaration(node)) {
			return false
		}

		return isComponent()
	},
	(node: ts.ClassDeclaration, helper: TSHelper, modifier: SourceFileModifier) => {

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

		let renderType = helper.getClassMethodReturnType(renderMethod)
		if (!renderType) {
			return node
		}

		let factory = helper.ts.factory
		let typeText = helper.getTypeSymbolText(renderType)
		let slotType: 'TemplateResult' | 'TemplateResultArray' | 'Text' | null = null

		// Check Slot Type.
		if (renderType.isUnion()) {}
		else if (typeText === 'TemplateResult') {
			slotType = 'TemplateResult'
		}
		else if (typeText === 'Array') {
			slotType = 'TemplateResultArray'
		}
		else if (renderType.getFlags() & (helper.ts.TypeFlags.String | helper.ts.TypeFlags.Number)) {
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
