import ts from 'typescript'
import * as path from 'node:path'
import {defineVisitor, embedSVG, sourceFile, Interpolator, InterpolationContentType} from '../core'
import {SVGInliner} from './svg-inliner'


// `import Name from './a.svg'` -> `const Name = "..."`
// `export {default as Name} from './a.svg'`
defineVisitor(function(node: ts.Node) {
	if (!embedSVG) {
		return
	}

	let beImport = ts.isImportDeclaration(node)
		&& node.importClause?.name

	let beExport = ts.isExportDeclaration(node)
		&& node.exportClause
		&& ts.isNamedExports(node.exportClause)
		&& node.exportClause.elements.length === 1
		&& node.exportClause.elements[0].propertyName?.text === 'default'
		&& ts.isIdentifier(node.exportClause.elements[0].name)
	
	if (!beImport && !beExport) {
		return
	}

	let moduleName = beImport
		? (node as ts.ImportDeclaration).importClause!.name!
		: ((node as ts.ExportDeclaration).exportClause as ts.NamedExports).elements[0].name as ts.Identifier

	let specifier = (node as ts.ImportDeclaration | ts.ExportDeclaration).moduleSpecifier
	if (!specifier || !ts.isStringLiteral(specifier)) {
		return
	}

	let relativePath = specifier.text
	if (!relativePath.startsWith('.')
		|| !relativePath.endsWith('.svg')
	) {
		return
	}

	let svgPath = path.resolve(path.dirname(sourceFile.fileName), relativePath)
	let svgCode = new SVGInliner(svgPath, {compress: true, mainColor: '#000000'}).output()

	Interpolator.replace(node, InterpolationContentType.Normal, () => {
		return ts.factory.createVariableStatement(
			beExport ? [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)] : undefined,
			ts.factory.createVariableDeclarationList(
				[
					ts.factory.createVariableDeclaration(
						moduleName,
						undefined,
						undefined,
						ts.factory.createStringLiteral(svgCode)
					),
				],
				ts.NodeFlags.Const
			)
		);
	})
})
