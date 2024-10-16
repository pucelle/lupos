import type TS from 'typescript'
import {ts, defineVisitor, Modifier, Helper, factory, TemplateSlotPlaceholder, ScopeTree, transformContext, MethodOverwrite, VisitTree} from '../base'


// Add `ensureComponentStyle` to `onCreated`.
defineVisitor(function(node: TS.Node, _index: number) {
	if (!ts.isClassDeclaration(node)) {
		return
	}

	// Be a component.
	if (!Helper.cls.isDerivedOf(node, 'Component', '@pucelle/lupos.js')) {
		return
	}

	let created = new MethodOverwrite(node, 'onCreated')
	let names: Set<string> = new Set()
	componentDetectionVisitor(node, node, names)

	if (names.size === 0) {
		return
	}

	Modifier.addImport('ensureComponentStyle', '@pucelle/lupos.js')

	for (let name of names) {
		created.add(
			[factory.createExpressionStatement(factory.createCallExpression(
				factory.createIdentifier('ensureComponentStyle'),
				undefined,
				[factory.createIdentifier(name)]
			))],
			'before-super'
		)
	}

	created.output()
})


/** Visit each node to detect referenced component constructors. */
function componentDetectionVisitor(node: TS.Node, comDecl: TS.ClassDeclaration, names: Set<string>): TS.Node {
	if (Helper.variable.isVariableIdentifier(node)) {
		variableVisitor(node, comDecl, names)
	}
	else if (ts.isTaggedTemplateExpression(node)) {
		templateVisitor(node, comDecl, names)
	}

	return ts.visitEachChild(node, n => componentDetectionVisitor(n, comDecl, names), transformContext)
}

/** Visit a variable node. */
function variableVisitor(node: TS.Identifier, comDecl: TS.ClassDeclaration, names: Set<string>) {
	let nm = Helper.symbol.resolveImport(node)
	if (!nm || nm.moduleName !== '@pucelle/lupos.js') {
		return
	}

	let cls = Helper.symbol.resolveDeclaration(node, ts.isClassDeclaration)
	if (!cls) {
		return
	}

	let beComponent = Helper.cls.isDerivedOf(cls, 'Component', '@pucelle/lupos.js')
	if (!beComponent) {
		return
	}

	// If declare target component within current.
	if (VisitTree.isAncestorOf(VisitTree.getIndex(comDecl), VisitTree.getIndex(cls))) {
		return
	}

	names.add(node.text)
}

/** Visit a template node. */
function templateVisitor(node: TS.TaggedTemplateExpression, comDecl: TS.ClassDeclaration, names: Set<string>) {
	let nm = Helper.symbol.resolveImport(node.tag)
	if (!nm || nm.moduleName !== '@pucelle/lupos.js') {
		return
	}

	if (nm.memberName !== 'html' && nm.memberName !== 'svg') {
		return
	}

	let string = TemplateSlotPlaceholder.toTemplateString(node)
	let comNames = [...string.matchAll(/<([A-Z]\w*)/g)].map(v => v[1])

	for (let comName of comNames) {
		let comImport = ScopeTree.getDeclarationByName(comName, node)
		if (!comImport) {
			continue
		}

		let cls = Helper.symbol.resolveDeclaration(comImport, ts.isClassDeclaration)
		if (!cls) {
			continue
		}

		let beComponent = Helper.cls.isDerivedOf(cls, 'Component', '@pucelle/lupos.js')
		if (!beComponent) {
			continue
		}

		// If declare target component within current.
		if (VisitTree.isAncestorOf(VisitTree.getIndex(comDecl), VisitTree.getIndex(cls))) {
			return
		}

		names.add(comName)
	}
}
