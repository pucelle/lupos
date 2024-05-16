import type * as ts from 'typescript'
import {removeQuotes} from './utils'


/** Help to get and check. */
export class TSHelper {

	readonly typeChecker: ts.TypeChecker
	readonly ts: typeof ts

	constructor(program: ts.Program, typescript: typeof ts) {
		this.typeChecker = program.getTypeChecker()
		this.ts = typescript
	}


	//// Class part

	/** Get name of a class member, even not appended. */
	getAnyClassMemberName(node: ts.ClassElement): string {
		if (this.ts.isConstructorDeclaration(node)) {
			return 'constructor'
		}
		else {
			return (node.name as ts.Identifier).escapedText as string
		}
	}

	/** Get specified named of class property declaration. */
	getClassProperty(node: ts.ClassDeclaration, propertyName: string, followExtend: boolean = false): ts.PropertyDeclaration | undefined {
		if (followExtend) {
			let prop = this.getClassProperty(node, propertyName, false)
			if (prop) {
				return prop
			}

			let superClass = this.getSuperClass(node)
			if (superClass) {
				return this.getClassProperty(superClass, propertyName, followExtend)
			}

			return undefined
		}
		else {
			return node.members.find(m => {
				return this.ts.isPropertyDeclaration(m)
					&& m.name?.getText() === propertyName
			}) as ts.PropertyDeclaration | undefined
		}
	}

	/** Get specified named of class method declaration. */
	getClassMethod(node: ts.ClassDeclaration, methodName: string, followExtend: boolean = false): ts.MethodDeclaration | undefined {
		if (followExtend) {
			let prop = this.getClassMethod(node, methodName, false)
			if (prop) {
				return prop
			}

			let superClass = this.getSuperClass(node)
			if (superClass) {
				return this.getClassMethod(superClass, methodName, followExtend)
			}

			return undefined
		}
		else {
			return node.members.find(m => {
				return this.ts.isMethodDeclaration(m)
					&& m.name?.getText() === methodName
			}) as ts.MethodDeclaration | undefined
		}
	}

	/** Get super class declaration. */
	getSuperClass(node: ts.ClassDeclaration): ts.ClassDeclaration | undefined {
		let extendHeritageClause = node.heritageClauses?.find(hc => {
			return hc.token === this.ts.SyntaxKind.ExtendsKeyword
		})

		if (!extendHeritageClause) {
			return undefined
		}

		let firstType = extendHeritageClause.types[0]
		if (!firstType || !this.ts.isExpressionWithTypeArguments(firstType)) {
			return undefined
		}

		let exp = firstType.expression
		let dls = this.resolveDeclarations(exp)
		let superClass = dls?.find(d => this.ts.isClassDeclaration(d))

		return superClass as ts.ClassDeclaration | undefined
	}

	/** Test whether is derived class of a specified named class, of specified module. */
	isDerivedClassOf(node: ts.ClassDeclaration, name: string, moduleName: string): boolean {
		let extendHeritageClause = node.heritageClauses?.find(hc => {
			return hc.token === this.ts.SyntaxKind.ExtendsKeyword
		})

		if (!extendHeritageClause) {
			return false
		}

		let firstType = extendHeritageClause.types[0]
		if (!firstType || !this.ts.isExpressionWithTypeArguments(firstType)) {
			return false
		}

		let exp = firstType.expression

		let moduleAndName = this.getImportNameAndModule(exp)
		if (moduleAndName) {
			if (moduleAndName.module === moduleName && moduleAndName.name === name) {
				return true
			}
		}

		let dls = this.resolveDeclarations(exp)
		let superClass = dls?.find(d => this.ts.isClassDeclaration(d)) as ts.ClassDeclaration | undefined

		if (superClass) {
			return this.isDerivedClassOf(superClass, name, moduleName)
		}

		return false
	}

	/** Test whether current class or super class implements a type located at a module. */
	isClassImplemented(node: ts.ClassDeclaration, typeName: string, moduleName: string): boolean {
		let implementClauses = node.heritageClauses?.find(h => {
			return h.token === this.ts.SyntaxKind.ImplementsKeyword
		})

		if (implementClauses) {
			let implementModules = implementClauses.types.find(type => {
				let nm = this.getImportNameAndModule(type.expression)
				return nm && nm.name === typeName && nm.module === moduleName
			})

			if (implementModules) {
				return true
			}
		}

		let superClass = this.getSuperClass(node)
		if (!superClass) {
			return false
		}

		return this.isClassImplemented(superClass, typeName, moduleName)
	}

	/** Get the first decorator of a class declaration, a property or method declaration. */
	getFirstDecorator(node: ts.ClassDeclaration | ts.MethodDeclaration | ts.PropertyDeclaration): ts.Decorator | undefined {
		return node.modifiers?.find(m => this.ts.isDecorator(m)) as ts.Decorator | undefined
	}

	/** Get the first decorator name of a decorator. */
	getDecoratorName(node: ts.Decorator): string | undefined {
		let exp = node.expression

		let identifier = this.ts.isCallExpression(exp) 
			? exp.expression
			: exp

		if (!this.ts.isIdentifier(identifier)) {
			return undefined
		}

		let moduleAndName = this.getImportNameAndModule(exp)
		if (moduleAndName) {
			return moduleAndName.name
		}

		let decls = this.resolveDeclarations(identifier)
		let fn = decls?.find(decl => this.ts.isFunctionDeclaration(decl)) as ts.FunctionDeclaration | undefined
		if (!fn) {
			return undefined
		}

		return fn.name?.getText()
	}

	/** Get constructor. */
	getConstructor(node: ts.ClassDeclaration): ts.ConstructorDeclaration | undefined {
		return node.members.find(v => this.ts.isConstructorDeclaration(v)) as ts.ConstructorDeclaration | undefined
	}

	/** Get constructor parameter list. */
	getConstructorParameters(node: ts.ClassDeclaration): ts.ParameterDeclaration[] | undefined {
		let constructor = this.getConstructor(node)
		if (constructor) {
			return [...constructor.parameters]
		}
		
		let superClass = this.getSuperClass(node)
		if (superClass) {
			return this.getConstructorParameters(superClass)
		}

		return undefined
	}

	/** Whether has specified modifier. */
	hasModifier(node: ts.PropertyDeclaration | ts.MethodDeclaration, name: 'readonly' | 'static' | 'protected' | 'private'): boolean {
		for (let modifier of node.modifiers || []) {
			if (modifier.kind === this.ts.SyntaxKind.ReadonlyKeyword && name === 'readonly') {
				return true
			}
			else if (modifier.kind === this.ts.SyntaxKind.StaticKeyword && name === 'static') {
				return true
			}
			else if (modifier.kind === this.ts.SyntaxKind.ProtectedKeyword && name === 'protected') {
				return true
			}
			else if (modifier.kind === this.ts.SyntaxKind.PrivateKeyword && name === 'private') {
				return true
			}
		}

		return false
	}



	//// Tagged Template

	/** Get the name of a tagged template. */
	getTaggedTemplateName(node: ts.TaggedTemplateExpression): string | undefined {
		let moduleAndName = this.getImportNameAndModule(node.tag)
		if (moduleAndName) {
			return moduleAndName.name
		}

		let tagNameDecls = this.resolveDeclarations(node.tag)
		let tagNameDecl = tagNameDecls?.find(d => this.ts.isFunctionDeclaration(d)) as ts.FunctionDeclaration
		return tagNameDecl?.name?.getText()
	}



	//// Type

	/** Get the text of a type. */
	getTypeSymbolText(type: ts.Type): string | undefined {
		let symbol = type.getSymbol()
		if (!symbol) {
			return undefined
		}

		return symbol.getName()
	}

	/** Get the returned type of a method node. */
	getClassMethodReturnType(node: ts.MethodDeclaration): ts.Type | undefined {
		let signature = this.typeChecker.getSignatureFromDeclaration(node)
		if (!signature) {
			return undefined
		}

		return signature.getReturnType()
	}



	//// Symbol

	/** Get the import name and module. */
	getImportNameAndModule(node: ts.Node): {name: string, module: string} | undefined {
		if (this.ts.isPropertyAccessExpression(node)) {
			let name = node.name.getText()
			let symbol = this.getSymbol(node.expression)
			let decls = symbol ? this.resolveSymbolDeclarations(symbol) : undefined
			let decl = decls?.find(d => this.ts.isNamespaceImport(d)) as ts.NamespaceImport | undefined

			if (decl) {
				return {
					name,
					module: removeQuotes(decl.parent.parent.moduleSpecifier.getText()),
				}
			}
		}
		else {
			let symbol = this.getSymbol(node)
			let decls = symbol ? this.resolveSymbolDeclarations(symbol) : undefined
			let decl = decls?.find(d => this.ts.isImportSpecifier(d)) as ts.ImportSpecifier | undefined

			if (decl) {
				return {
					name: (decl.propertyName || decl.name).getText(),
					module: removeQuotes(decl.parent.parent.parent.moduleSpecifier.getText()),
				}
			}
		}

		return undefined
	}

	/** Get the symbol of a given node. */
	getSymbol(node: ts.Node, resolveAlias: boolean = false): ts.Symbol | undefined {
		let symbol = this.typeChecker.getSymbolAtLocation(node)

		// Get symbol from identifier.
		if (!symbol && !this.ts.isIdentifier(node)) {
			let identifier = this.getIdentifier(node)
			symbol = identifier ? this.typeChecker.getSymbolAtLocation(identifier) : undefined
		}

		// Resolve aliased symbols to it's original declared place.
		if (resolveAlias && symbol && this.isAliasSymbol(symbol)) {
			symbol = this.typeChecker.getAliasedSymbol(symbol)
		}

		return symbol
	}

	/** Returns the identifier, like variable or declaration name of a given node if possible. */
	getIdentifier(node: ts.Node): ts.Identifier | undefined {

		// Variable.
		if (this.ts.isIdentifier(node)) {
			return node
		}

		// Class or interface, property, method, function name.
		if ((this.ts.isClassLike(node)
			|| this.ts.isInterfaceDeclaration(node)
			|| this.ts.isVariableDeclaration(node)
			|| this.ts.isMethodDeclaration(node)
			|| this.ts.isPropertyDeclaration(node)
			|| this.ts.isFunctionDeclaration(node)
			)
			&& node.name
			&& this.ts.isIdentifier(node.name)
		) {
			return node.name
		}

		return undefined
	}

	/** Returns whether the symbol has `alias` flag. */
	isAliasSymbol(symbol: ts.Symbol): boolean {
		return (symbol.flags & this.ts.SymbolFlags.Alias) > 0
	}

	/** 
	 * Resolves the declarations of a node.
	 * A valueDeclaration is always the first entry in the array.
	 */
	resolveDeclarations(node: ts.Node): ts.Declaration[] | undefined {
		let symbol = this.getSymbol(node, true)
		if (!symbol) {
			return []
		}

		return this.resolveSymbolDeclarations(symbol)
	}

	/** Resolves the declarations of a symbol. A valueDeclaration is always the first entry in the array. */
	resolveSymbolDeclarations(symbol: ts.Symbol): ts.Declaration[] {
		let valueDeclaration = symbol.valueDeclaration
		let declarations = symbol.getDeclarations() || []

		if (valueDeclaration && declarations.indexOf(valueDeclaration) === -1) {

			// Make sure that `valueDeclaration` is always the first entry.
			declarations = [valueDeclaration, ...declarations]
		}

		return declarations
	}
}