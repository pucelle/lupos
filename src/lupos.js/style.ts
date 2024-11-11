import type TS from 'typescript'
import {ts, defineVisitor, Helper, factory, Interpolator, InterpolationContentType} from '../core'


// Add `Com.ensureStyle()` after class declaration.
defineVisitor(function(node: TS.Node, index: number) {
	if (!ts.isClassDeclaration(node)) {
		return
	}

	// Must have name.
	if (!node.name) {
		return
	}

	// Be a component.
	if (!Helper.cls.isDerivedOf(node, 'Component', '@pucelle/lupos.js')) {
		return
	}

	// Must has own style declared.
	let style = Helper.cls.getMember(node, 'style')
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

	Interpolator.after(index, InterpolationContentType.Normal, () => callEnsureStyle)
})
