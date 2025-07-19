import * as ts from 'typescript'
import {defineVisitor, factory, Interpolator, InterpolationContentType, helper} from '../core'


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

	// Must has own style declared.
	let style = helper.objectLike.getMember(node, 'style', false)
	if (!style
		|| !ts.isPropertyDeclaration(style) && !ts.isMethodDeclaration(style)
		|| !style.modifiers?.some(m => m.kind === ts.SyntaxKind.StaticKeyword)
	) {
		return
	}

	let callEnsureStyle = factory.createCallExpression(
		factory.createPropertyAccessExpression(
		  	factory.createIdentifier(node.name.text),
		  	factory.createIdentifier('ensureStyle')
		),
		undefined,
		[]
	)

	// For tree shaking.
	ts.setSyntheticLeadingComments(callEnsureStyle, [
		{
			text: "#__PURE__",
			kind: ts.SyntaxKind.MultiLineCommentTrivia,
			pos: -1,
			end: -1,
			hasTrailingNewLine: false,
		}
	])

	Interpolator.after(node, InterpolationContentType.Normal, () => callEnsureStyle)
})
