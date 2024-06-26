import type TS from 'typescript'
import {helper, defineVisitor, ts, modifier} from '../base'


defineVisitor(

	// Be derived class of `Component`.
	// May switch to match `render` method?
	(node: TS.Node) => {
		if (!ts.isClassDeclaration(node)) {
			return false
		}

		// Be a component.
		return helper.isDerivedClassOf(node, 'Component', '@pucelle/lupos.js')
	},
	(node: TS.ClassDeclaration) => {

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

		let factory = ts.factory
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

			return modifier.addClassMembers(node, [property], true)	  
		}

		return node
	},
)
