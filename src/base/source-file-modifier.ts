import {ListMap, difference} from '../utils'
import type TS from 'typescript'
import {factory, transformContext, ts} from './global'
import {helper} from './helper'


/** Help to get properties and info. */
export class SourceFileModifier {
	
	readonly imports: ListMap<string, string> = new ListMap()


	//// Class

	/** Add a member to class. */
	addClassMembers(node: TS.ClassDeclaration, members: TS.ClassElement[], insertHead: boolean = false) {
		let newMembers = [...node.members]

		if (insertHead) {
			newMembers.unshift(...members)
		}
		else {
			newMembers.push(...members)
		}

		return factory.updateClassDeclaration(
			node, 
			node.modifiers,
			node.name,
			node.typeParameters,
			node.heritageClauses,
			newMembers,
		)
	}

	/** Add a member to class, if same named members exist, replace it. */
	replaceClassMembers(node: TS.ClassDeclaration, members: TS.ClassElement[], insertHead: boolean = false) {
		let newMembers = [...node.members]
		let replacedMembers: Set<TS.ClassElement> = new Set()

		let memberNameMap = new Map(members.map(m => {
			return [
				helper.getClassMemberName(m),
				m,
			]
		}))

		newMembers = newMembers.map(m => {
			let name = helper.getClassMemberName(m)
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

		return factory.updateClassDeclaration(
			node, 
			node.modifiers,
			node.name,
			node.typeParameters,
			node.heritageClauses,
			newMembers,
		)
	}

	

	//// Import & Export

	/** 
	 * Add a named import - `import {name} from moduleName`.
	 * Repetitive adding will be eliminated.
	 */
	addNamedImport(name: string, moduleName: string) {
		this.imports.addIf(moduleName, name)
	}

	/** Get import statement come from specified module name. */
	getNamedImportFromModule(sourceFile: TS.SourceFile, moduleName: string): TS.ImportDeclaration | undefined {
		return sourceFile.statements.find(st => {
			return ts.isImportDeclaration(st)
				&& ts.isStringLiteral(st.moduleSpecifier)
				&& st.moduleSpecifier.text === moduleName
				&& st.importClause?.namedBindings
				&& ts.isNamedImports(st.importClause?.namedBindings)
		}) as TS.ImportDeclaration | undefined
	}

	/** Apply imports to source file, returns a new. */
	output(sourceFile: TS.SourceFile): TS.SourceFile {

		// A ts bug here: if insert some named import identifiers,
		// and update the import statement,
		// will cause some not used type imports still there.
		// Current process step is: leave them there and wait for package step to eliminate.
		
		for (let [moduleName, names] of this.imports.entries()) {
			let statements: ReadonlyArray<TS.Statement> = sourceFile.statements
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
	addNamesToImport(importDecl: TS.ImportDeclaration, names: string[]): TS.ImportDeclaration {
		const visit = (node: TS.Node) => {
			if (!ts.isNamedImports(node)) {
				return ts.visitEachChild(node, visit, transformContext)
			}

			let oldImports = node.elements
			let oldNames = oldImports.map(im => im.name.text) || []
			let newNames = difference(names, oldNames)

			if (newNames.length === 0) {
				return node
			}

			let newImports = newNames.map(name => factory.createImportSpecifier(
				false,
				undefined,
				factory.createIdentifier(name)
			))

			return factory.updateNamedImports(node, [...oldImports, ...newImports])
		}

		return ts.visitNode(importDecl, visit) as TS.ImportDeclaration
	}



	//// Expression & Statement

	/** Add expressions to the end of a block. */
	addExpressionsToBlock<T extends TS.Block | TS.SourceFile>(node: T, exps: TS.Expression[]): T {
		if (exps.length === 0) {
			return node
		}

		let oldStatements = node.statements
		let stats = [...oldStatements]

		stats.push(...exps.map(exp => factory.createExpressionStatement(exp)))

		if (ts.isBlock(node)) {
			return factory.updateBlock(node, stats) as T
		}
		else {
			return factory.updateSourceFile(node, stats) as T
		}
	}

	/** Add expressions to the end of an arrow function. */
	addExpressionsToArrowFunction(node: TS.ArrowFunction, exps: TS.Expression[]): TS.ArrowFunction {
		if (exps.length === 0) {
			return node
		}

		let block: TS.Block

		if (ts.isBlock(node.body)) {
			block = this.addExpressionsToBlock(node.body, exps)
		}
		else {
			block = factory.createBlock([
				...exps.map(exp => factory.createExpressionStatement(exp)),
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

	/** Add expressions to a conditional expression. */
	addExpressionsToSingleExpression(node: TS.Expression, exps: TS.Expression[]): TS.Expression {
		if (exps.length === 0) {
			return node
		}

		let newExp: TS.Expression = node

		for (let i = exps.length - 1; i >= 0; i--) {
			newExp = factory.createBinaryExpression(
				exps[i],
				factory.createToken(ts.SyntaxKind.CommaToken),
				newExp
			)
		}

		return factory.createParenthesizedExpression(newExp)
	}

	/** Remove commands of a property accessing node. */
	removePropertyAccessingComments<T extends TS.Node>(node: T): T {
		if (ts.isPropertyAccessExpression(node)) {
			return factory.createPropertyAccessExpression(
				this.removePropertyAccessingComments(node.expression),
				node.name
			) as TS.Node as T
		}
		else if (ts.isElementAccessExpression(node)) {
			return factory.createElementAccessExpression(
				this.removePropertyAccessingComments(node.expression),
				node.argumentExpression
			) as TS.Node as T
		}
		else if (ts.isIdentifier(node)) {
			return factory.createIdentifier(node.getText()) as TS.Node as T
		}
		else if (node.kind === ts.SyntaxKind.ThisKeyword) {
			return factory.createThis() as TS.Node as T
		}
		else {
			return node
		}
	}
}