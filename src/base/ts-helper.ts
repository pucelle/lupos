import type * as ts from 'typescript'


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

	/** Get a super class of specified name recursively. */
	getSuperClassOfName(node: ts.ClassDeclaration, name: string): ts.ClassDeclaration | undefined {
		if (node.name?.getText() === name) {
			return node
		}

		let superClass = this.getSuperClass(node)
		if (superClass) {
			return this.getSuperClassOfName(superClass, name)
		}

		return undefined
	}

	/** Test whether is derived class of a specified named class. */
	isDerivedClassOfNamed(node: ts.ClassDeclaration, name: string): boolean {
		let superClass = this.getSuperClassOfName(node, name)
		if (!superClass) {
			return false
		}

		return true
	}

	/** Get a super class of specified decorated name recursively. */
	getSuperClassOfDecoratedName(node: ts.ClassDeclaration, decoratorName: string): ts.ClassDeclaration | undefined {
		let decorator = this.getFirstDecorator(node)
		if (decorator && this.getDecoratorName(decorator) === decoratorName) {
			return node
		}

		let superClass = this.getSuperClass(node)
		if (superClass) {
			return this.getSuperClassOfDecoratedName(superClass, decoratorName)
		}

		return undefined
	}

	/** Test whether is derived class of a class decorated with specified named decorator. */
	isDerivedClassOfDecorated(node: ts.ClassDeclaration, decoratorName: string): boolean {
		let superClass = this.getSuperClassOfDecoratedName(node, decoratorName)
		if (!superClass) {
			return false
		}

		return true
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

		let decls = this.resolveDeclarations(identifier)
		if (!decls) {
			return undefined
		}

		let fn = decls.find(decl => this.ts.isFunctionDeclaration(decl)) as ts.FunctionDeclaration | undefined
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



	//// Normal Node

	/** Get module name of a node. */
	getModuleName(node: ts.Node): string | undefined {
		return node.getSourceFile().moduleName
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

	/** Get the symbol of a given node. */
	getNodeSymbol(node: ts.Node): ts.Symbol | null {
		let symbol = this.typeChecker.getSymbolAtLocation(node) || null

		if (!symbol) {
			let identifier = this.getNodeIdentifier(node)
			symbol = identifier ? this.typeChecker.getSymbolAtLocation(identifier) || null : null
		}

		// Resolve aliased symbols to it's original declared place.
		if (symbol && this.isAliasSymbol(symbol)) {
			symbol = this.typeChecker.getAliasedSymbol(symbol)
		}

		return symbol
	}

	/** Returns the identifier, like variable or declaration name of a given node if possible. */
	getNodeIdentifier(node: ts.Node): ts.Identifier | null {

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

		return null
	}

	/** Returns whether the symbol has `alias` flag. */
	isAliasSymbol(symbol: ts.Symbol): boolean {
		return (symbol.flags & this.ts.SymbolFlags.Alias) > 0
	}

	/** Resolves the declarations of a node. A valueDeclaration is always the first entry in the array. */
	resolveDeclarations(node: ts.Node): ts.Declaration[] | undefined {
		let symbol = this.getNodeSymbol(node)
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