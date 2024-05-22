import {TSHelper} from './ts-helper'
import {ListMap, difference} from '../utils'
import type * as ts from 'typescript'


/** Help to get properties and info. */
export class SourceFileModifier {
	
	readonly helper: TSHelper
	readonly ts: typeof ts
	readonly context: ts.TransformationContext
	readonly imports: ListMap<string, string> = new ListMap()

	constructor(helper: TSHelper, ctx: ts.TransformationContext) {
		this.helper = helper
		this.ts = helper.ts
		this.context = ctx
	}


	//// Class

	/** Add a member to class. */
	addClassMembers(node: ts.ClassDeclaration, members: ts.ClassElement[], insertHead: boolean = false) {
		let newMembers = [...node.members]

		if (insertHead) {
			newMembers.unshift(...members)
		}
		else {
			newMembers.push(...members)
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

	/** Add a member to class, if same named members exist, replace it. */
	replaceClassMembers(node: ts.ClassDeclaration, members: ts.ClassElement[], insertHead: boolean = false) {
		let newMembers = [...node.members]
		let replacedMembers: Set<ts.ClassElement> = new Set()

		let memberNameMap = new Map(members.map(m => {
			return [
				this.helper.getAnyClassMemberName(m),
				m,
			]
		}))

		newMembers = newMembers.map(m => {
			let name = this.helper.getAnyClassMemberName(m)
			if (memberNameMap.has(name)) {
				let newMember = memberNameMap.get(name)!
				replacedMembers.add(newMember)
				return newMember
			}
			else {
				return m
			}
		})

		let restMembers = difference(members, replacedMembers)
		if (restMembers.length > 0) {
			if (insertHead) {
				newMembers.unshift(...restMembers)
			}
			else {
				newMembers.push(...restMembers)
			}
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

	/** 
	 * Add a named import - `import {name} from moduleName`.
	 * Repetitive adding will be eliminated.
	 */
	addNamedImport(name: string, moduleName: string) {
		this.imports.addIf(moduleName, name)
	}

	/** Get import statement come from specified module name. */
	getNamedImportFromModule(sourceFile: ts.SourceFile, moduleName: string): ts.ImportDeclaration | undefined {
		return sourceFile.statements.find(st => {
			return this.ts.isImportDeclaration(st)
				&& this.helper.ts.isStringLiteral(st.moduleSpecifier)
				&& st.moduleSpecifier.text === moduleName
				&& st.importClause?.namedBindings
				&& this.ts.isNamedImports(st.importClause?.namedBindings)
		}) as ts.ImportDeclaration | undefined
	}

	/** Apply imports to source file, returns a new. */
	output(sourceFile: ts.SourceFile): ts.SourceFile {
		let factory = this.ts.factory

		// A ts bug here: if insert some named import identifiers,
		// and update the import statement,
		// will cause some not used type imports still there.
		// Current process step is: leave them there and wait for package step to eliminate.
		
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

				statements = [importDecl, ...statements]
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
				return node
			}

			let newImports = newNames.map(name => this.ts.factory.createImportSpecifier(
				false,
				undefined,
				this.ts.factory.createIdentifier(name)
			))

			return this.ts.factory.updateNamedImports(node, [...oldImports, ...newImports])
		}

		return this.ts.visitNode(importDecl, visit) as ts.ImportDeclaration
	}



	//// Expression & Statement

	/** Add statements to an arrow function. */
	addStatementsBeforeReturning(node: ts.Block, statements: ts.Statement[]): ts.Block {
		if (statements.length === 0) {
			return node
		}

		let oldStatements = node.statements
		let returnStatementIndex = oldStatements.findLastIndex(stat => this.ts.isReturnStatement(stat))
		let newStatements: ts.Statement[] = []

		if (returnStatementIndex >= 0) {
			newStatements = oldStatements.toSpliced(returnStatementIndex, 0, ...statements)
		}
		else {
			newStatements = [...oldStatements, ...statements]
		}

		return this.ts.factory.createBlock(newStatements, true)
	}

	/** Add statements to an arrow function. */
	addStatementsToArrowFunction(node: ts.ArrowFunction, statements: ts.Statement[]): ts.ArrowFunction {
		if (statements.length === 0) {
			return node
		}

		let block: ts.Block
		let factory = this.ts.factory

		if (this.ts.isBlock(node.body)) {
			block = this.addStatementsBeforeReturning(node.body, statements)
		}
		else {
			block = factory.createBlock([
				...statements,
				factory.createReturnStatement(node.body),			  
			], true)
		}
		
		node = factory.updateArrowFunction(
			node,
			node.modifiers,
			node.typeParameters,
			node.parameters,
			node.type,
			node.equalsGreaterThanToken,
			block
		)

		return node
	}
}