import {ListMap, difference} from '../utils'
import type TS from 'typescript'
import {factory, transformContext, ts} from './global'
import {PropertyAccessingNode, helper} from './helper'


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

	/** Bundle expressions to a parenthesized expression. */
	parenthesizeExpressions(...exps: TS.Expression[]): TS.Expression {
		let exp = exps[0]

		// `a, b, c...`
		for (let i = 1; i < exps.length; i++) {
			exp = factory.createBinaryExpression(
				exp,
				factory.createToken(ts.SyntaxKind.CommaToken),
				exps[i]
			)
		}

		return factory.createParenthesizedExpression(exp)
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
			return factory.createIdentifier(helper.getText(node)) as TS.Node as T
		}
		else if (node.kind === ts.SyntaxKind.ThisKeyword) {
			return factory.createThis() as TS.Node as T
		}

		return node
	}

	/** 
	 * Replace property accessing expression to a reference.
	 * `a.b().c -> _ref_.c`
	 */
	replaceReferencedAccessingExpression(node: PropertyAccessingNode, exp: TS.Expression): PropertyAccessingNode {
		if (ts.isPropertyAccessExpression(node)) {
			return factory.createPropertyAccessExpression(
				exp,
				node.name
			)
		}
		else {
			return factory.createElementAccessExpression(
				exp,
				node.argumentExpression
			)
		}
	}
}