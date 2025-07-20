import * as ts from 'typescript'
import {defineVisitor, factory, Interpolator, InterpolationContentType, helper, Modifier} from '../core'


// Add `Com.ensureStyle()` after class declaration.
defineVisitor(function(node: ts.Node) {
	if (!ts.isClassDeclaration(node)) {
		return
	}

	// Must have name.
	if (!node.name) {
		return
	}

	// Be a component.
	if (!helper.objectLike.isDerivedOf(node, 'Component', '@pucelle/lupos.js')) {
		return
	}

	// Must has own static style declared.
	let style = helper.objectLike.getMember(node, 'style', false)
	if (!style
		|| !ts.isPropertyDeclaration(style) && !ts.isMethodDeclaration(style)
		|| !style.modifiers?.some(m => m.kind === ts.SyntaxKind.StaticKeyword)
		|| ts.isPropertyDeclaration(style) && !style.initializer
		|| ts.isMethodDeclaration(style) && !style.body
	) {
		return
	}

	Modifier.addImport('addComponentStyle', '@pucelle/lupos.js')

	let className = node.name ? helper.getText(node.name) : ''

	// `style = css`...``
	if (ts.isPropertyDeclaration(style)) {
		let initializer = style.initializer!

		Interpolator.after(initializer, InterpolationContentType.Normal, () => {

			// Old initializer will be remove.
			let newInitializer = Interpolator.outputUniqueSelf(initializer, {canRemove: false}) as ts.Expression

			// `addComponentStyle(css`...`)`
			let newValue = factory.createCallExpression(
				factory.createIdentifier('addComponentStyle'),
				undefined,
				[
					newInitializer,
					factory.createStringLiteral(className)
				]
			)

			// For tree shaking.
			ts.setSyntheticLeadingComments(newValue, [
				{
					text: "#__PURE__",
					kind: ts.SyntaxKind.MultiLineCommentTrivia,
					pos: -1,
					end: -1,
					hasTrailingNewLine: false,
				}
			])

			return newValue
		})

		Interpolator.remove(initializer)
	}

	// `style(){...}`
	else {
		let body = style.body!

		Interpolator.replace(style, InterpolationContentType.Normal, () => {
			let newBody = Interpolator.outputUniqueSelf(body, {canRemove: false}) as ts.Expression

			// `() => {...}`
			let initializer = factory.createArrowFunction(
				undefined,
				undefined,
				[],
				undefined,
				factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
				newBody
			)
			
			// `addComponentStyle(() => {...})`
			let newValue = factory.createCallExpression(
				factory.createIdentifier('addComponentStyle'),
				undefined,
				[
					initializer,
					factory.createStringLiteral(className)
				]
			)

			// For tree shaking.
			ts.setSyntheticLeadingComments(newValue, [
				{
					text: "#__PURE__",
					kind: ts.SyntaxKind.MultiLineCommentTrivia,
					pos: -1,
					end: -1,
					hasTrailingNewLine: false,
				}
			])

			let property = factory.createPropertyDeclaration(
				[factory.createToken(ts.SyntaxKind.StaticKeyword)],
				factory.createIdentifier('style'),
				undefined,
				undefined,
				newValue
			)

			return property
		})
	}

})
