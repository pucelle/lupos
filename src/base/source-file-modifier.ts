import {ListMap, difference, removeQuotes} from './utils'
import type * as ts from 'typescript'


/** Help to get properties and info. */
export class SourceFileModifier {
	
	readonly ts: typeof ts
	readonly context: ts.TransformationContext
	readonly imports: ListMap<string, string> = new ListMap()

	constructor(typescript: typeof ts, ctx: ts.TransformationContext) {
		this.ts = typescript
		this.context = ctx
	}


	//// Class

	/** Add a member to class. */
	addClassMember(node: ts.ClassDeclaration, member: ts.ClassElement, insertHead: boolean = false) {
		let newMembers = [...node.members]

		if (insertHead) {
			newMembers.unshift(member)
		}
		else {
			newMembers.push(member)
		}

		return this.ts.factory.updateClassDeclaration(
			node, 
			node.modifiers,
			node.name,
			node.typeParameters,
			node.heritageClauses,
			newMembers,
		)
	}

	

	// Import & Export

	/** Add a named import - `import {name} from moduleName` */
	addNamedImport(name: string, moduleName: string) {
		this.imports.addIf(moduleName, name)
	}

	/** Get import statement come from specified module name. */
	getNamedImportFromModule(sourceFile: ts.SourceFile, moduleName: string): ts.ImportDeclaration | undefined {
		return sourceFile.statements.find(st => {
			return this.ts.isImportDeclaration(st)
				&& removeQuotes(st.moduleSpecifier.getText()) === moduleName
				&& st.importClause?.namedBindings
				&& this.ts.isNamedImports(st.importClause?.namedBindings)
		}) as ts.ImportDeclaration | undefined
	}

	/** Apply imports to source file, returns a new. */
	output(sourceFile: ts.SourceFile): ts.SourceFile {
		let factory = this.ts.factory

		for (let [moduleName, names] of this.imports.entries()) {
			let statements: ReadonlyArray<ts.Statement> = sourceFile.statements
			let importDecl = this.getNamedImportFromModule(sourceFile, moduleName)

			// Add more imports.
			if (importDecl) {
				let newImportDecl = this.addNamesToImport(importDecl, names)
				statements = statements.filter(s => s !== importDecl)
				statements = [newImportDecl, ...statements]
			}

			// Add an import statement.
			else {
				let namedImports = names.map(name => factory.createImportSpecifier(
					false,
					undefined,
					factory.createIdentifier(name)
				))

				let importDecl = factory.createImportDeclaration(
					undefined,
					factory.createImportClause(
						false,
						undefined,
						factory.createNamedImports(namedImports)
					),
					factory.createStringLiteral(moduleName),
					undefined
				)

				statements = [...statements, importDecl]
			}
			
			sourceFile = factory.updateSourceFile(sourceFile, statements)
		}

		return sourceFile
	}

	/** Add import name to an import declaration. */
	addNamesToImport(importDecl: ts.ImportDeclaration, names: string[]): ts.ImportDeclaration {
		const visit = (node: ts.Node) => {
			if (!this.ts.isNamedImports(node)) {
				return this.ts.visitEachChild(node, visit, this.context)
			}

			let oldImports = node.elements
			let oldNames = oldImports.map(im => im.name.getText()) || []
			let newNames = difference(names, oldNames)

			if (newNames.length === 0) {
				return this.ts.visitEachChild(node, visit, this.context)
			}

			let newImports = newNames.map(name => this.ts.factory.createImportSpecifier(
				false,
				undefined,
				this.ts.factory.createIdentifier(name)
			))

			node = this.ts.factory.updateNamedImports(node, [...oldImports, ...newImports])
			return this.ts.visitEachChild(node, visit, this.context)
		}

		return this.ts.visitNode(importDecl, visit) as ts.ImportDeclaration
	}
}