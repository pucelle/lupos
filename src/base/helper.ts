import type TS from 'typescript'
import {ts, typeChecker} from './global'


/** Property accessing types. */
export type PropertyAccessingNode = TS.PropertyAccessExpression | TS.ElementAccessExpression

/** Property accessing types. */
export type AssigningNode = TS.BinaryExpression | TS.PostfixUnaryExpression | TS.PrefixUnaryExpression


/** Help to get and check. */
export namespace helper {


	//// Basic types

	/** Whether node can have statements. */
	export function isStatementsExist(node: TS.Node): node is TS.Block | TS.SourceFile | TS.CaseOrDefaultClause {
		return ts.isBlock(node)
			|| ts.isSourceFile(node)
			|| ts.isCaseOrDefaultClause(node)
	}



	//// Class part

	/** Get name of a class member, even newly appended. */
	export function getClassMemberName(node: TS.ClassElement): string {
		if (ts.isConstructorDeclaration(node)) {
			return 'constructor'
		}

		// May node is not appended, thus `getText()` is not available.
		else {
			return (node.name as TS.Identifier).text
		}
	}

	/** Get specified named of class property declaration. */
	export function getClassProperty(node: TS.ClassDeclaration, propertyName: string, followExtend: boolean = false): TS.PropertyDeclaration | undefined {
		if (followExtend) {
			let prop = getClassProperty(node, propertyName, false)
			if (prop) {
				return prop
			}

			let superClass = getSuperClass(node)
			if (superClass) {
				return getClassProperty(superClass, propertyName, followExtend)
			}

			return undefined
		}
		else {
			return node.members.find(m => {
				return ts.isPropertyDeclaration(m)
					&& getClassMemberName(m) === propertyName
			}) as TS.PropertyDeclaration | undefined
		}
	}

	/** Get specified named of class method declaration. */
	export function getClassMethod(node: TS.ClassDeclaration, methodName: string, followExtend: boolean = false): TS.MethodDeclaration | undefined {
		if (followExtend) {
			let prop = getClassMethod(node, methodName, false)
			if (prop) {
				return prop
			}

			let superClass = getSuperClass(node)
			if (superClass) {
				return getClassMethod(superClass, methodName, followExtend)
			}

			return undefined
		}
		else {
			return node.members.find(m => {
				return ts.isMethodDeclaration(m)
					&& getClassMemberName(m) === methodName
			}) as TS.MethodDeclaration | undefined
		}
	}

	/** Get super class declaration. */
	export function getSuperClass(node: TS.ClassDeclaration): TS.ClassDeclaration | undefined {
		let extendHeritageClause = node.heritageClauses?.find(hc => {
			return hc.token === ts.SyntaxKind.ExtendsKeyword
		})

		if (!extendHeritageClause) {
			return undefined
		}

		let firstType = extendHeritageClause.types[0]
		if (!firstType || !ts.isExpressionWithTypeArguments(firstType)) {
			return undefined
		}

		let exp = firstType.expression
		let superClass = resolveOneDeclaration(exp, ts.isClassDeclaration)

		return superClass as TS.ClassDeclaration | undefined
	}

	/** Test whether is derived class of a specified named class, of specified module. */
	export function isDerivedClassOf(node: TS.ClassDeclaration, name: string, moduleName: string): boolean {
		let extendHeritageClause = node.heritageClauses?.find(hc => {
			return hc.token === ts.SyntaxKind.ExtendsKeyword
		})

		if (!extendHeritageClause) {
			return false
		}

		let firstType = extendHeritageClause.types[0]
		if (!firstType || !ts.isExpressionWithTypeArguments(firstType)) {
			return false
		}

		let exp = firstType.expression

		let moduleAndName = resolveImport(exp)
		if (moduleAndName) {
			if (moduleAndName.module === moduleName && moduleAndName.name === name) {
				return true
			}
		}

		let superClass = resolveOneDeclaration(exp, ts.isClassDeclaration)
		if (superClass) {
			return isDerivedClassOf(superClass, name, moduleName)
		}

		return false
	}

	/** Test whether current class or super class implements a type located at a module. */
	export function isClassImplemented(node: TS.ClassDeclaration, typeName: string, moduleName: string): boolean {
		let implementClauses = node.heritageClauses?.find(h => {
			return h.token === ts.SyntaxKind.ImplementsKeyword
		})

		if (implementClauses) {
			let implementModules = implementClauses.types.find(type => {
				let nm = resolveImport(type.expression)
				return nm && nm.name === typeName && nm.module === moduleName
			})

			if (implementModules) {
				return true
			}
		}

		let superClass = getSuperClass(node)
		if (!superClass) {
			return false
		}

		return isClassImplemented(superClass, typeName, moduleName)
	}

	/** Get the first decorator from a class declaration, a property or method declaration. */
	export function getFirstDecorator(node: TS.ClassDeclaration | TS.MethodDeclaration | TS.PropertyDeclaration): TS.Decorator | undefined {
		return node.modifiers?.find(m => ts.isDecorator(m)) as TS.Decorator | undefined
	}

	/** Get the first decorator name of a decorator. */
	export function getDecoratorName(node: TS.Decorator): string | undefined {
		let exp = node.expression

		let identifier = ts.isCallExpression(exp) 
			? exp.expression
			: exp

		if (!ts.isIdentifier(identifier)) {
			return undefined
		}

		let moduleAndName = resolveImport(exp)
		if (moduleAndName) {
			return moduleAndName.name
		}

		let decl = resolveOneDeclaration(identifier, ts.isFunctionDeclaration)
		if (!decl) {
			return undefined
		}

		return decl.name?.text
	}

	/** Get the first decorator from a class declaration, a property or method declaration. */
	export function getFirstDecoratorName(node: TS.ClassDeclaration | TS.MethodDeclaration | TS.PropertyDeclaration): string | undefined {
		let decorator = getFirstDecorator(node)
		let decoName = decorator ? getDecoratorName(decorator) : undefined

		return decoName
	}

	/** Get constructor. */
	export function getConstructor(node: TS.ClassDeclaration): TS.ConstructorDeclaration | undefined {
		return node.members.find(v => ts.isConstructorDeclaration(v)) as TS.ConstructorDeclaration | undefined
	}

	/** Get constructor parameter list. */
	export function getConstructorParameters(node: TS.ClassDeclaration): TS.ParameterDeclaration[] | undefined {
		let constructor = getConstructor(node)
		if (constructor) {
			return [...constructor.parameters]
		}
		
		let superClass = getSuperClass(node)
		if (superClass) {
			return getConstructorParameters(superClass)
		}

		return undefined
	}

	/** Whether has specified modifier. */
	export function hasModifier(node: TS.PropertyDeclaration | TS.MethodDeclaration, name: 'readonly' | 'static' | 'protected' | 'private'): boolean {
		for (let modifier of node.modifiers || []) {
			if (modifier.kind === ts.SyntaxKind.ReadonlyKeyword && name === 'readonly') {
				return true
			}
			else if (modifier.kind === ts.SyntaxKind.StaticKeyword && name === 'static') {
				return true
			}
			else if (modifier.kind === ts.SyntaxKind.ProtectedKeyword && name === 'protected') {
				return true
			}
			else if (modifier.kind === ts.SyntaxKind.PrivateKeyword && name === 'private') {
				return true
			}
		}

		return false
	}



	//// Tagged Template

	/** Get the name of a tagged template. */
	export function getTaggedTemplateName(node: TS.TaggedTemplateExpression): string | undefined {
		let moduleAndName = resolveImport(node.tag)
		if (moduleAndName) {
			return moduleAndName.name
		}

		let tagNameDecl = resolveOneDeclaration(node.tag, ts.isFunctionDeclaration)
		return tagNameDecl?.name?.text
	}



	//// Property Accessing & Assignment

	/** Whether be property accessing like `a.b` or `a[b]`. */
	export function isPropertyAccessing(node: TS.Node): node is PropertyAccessingNode {
		return ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)
	}

	/** get property accessing name node. */
	export function getPropertyAccessingNameNode(node: PropertyAccessingNode): TS.Expression {
		return ts.isPropertyAccessExpression(node)
			? node.name
			: node.argumentExpression
	}

	/** get property accessing name. */
	export function getPropertyAccessingName(node: PropertyAccessingNode): string{
		return ts.isPropertyAccessExpression(node)
			? node.name.getText()
			: node.argumentExpression.getText()
	}

	/** Whether be property assigning like `a = x`. */
	export function isAssigning(node: TS.Node): node is AssigningNode {
		if (ts.isBinaryExpression(node)) {
			return node.operatorToken.kind === ts.SyntaxKind.EqualsToken
				|| node.operatorToken.kind === ts.SyntaxKind.PlusEqualsToken
				|| node.operatorToken.kind === ts.SyntaxKind.MinusEqualsToken
				|| node.operatorToken.kind === ts.SyntaxKind.AsteriskEqualsToken
				|| node.operatorToken.kind === ts.SyntaxKind.AsteriskAsteriskEqualsToken
				|| node.operatorToken.kind === ts.SyntaxKind.SlashEqualsToken
				|| node.operatorToken.kind === ts.SyntaxKind.PercentEqualsToken
				|| node.operatorToken.kind === ts.SyntaxKind.LessThanLessThanEqualsToken
				|| node.operatorToken.kind === ts.SyntaxKind.GreaterThanGreaterThanEqualsToken
				|| node.operatorToken.kind === ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken
				|| node.operatorToken.kind === ts.SyntaxKind.AmpersandEqualsToken
				|| node.operatorToken.kind === ts.SyntaxKind.BarEqualsToken
				|| node.operatorToken.kind === ts.SyntaxKind.BarBarEqualsToken
				|| node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandEqualsToken
				|| node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionEqualsToken
				|| node.operatorToken.kind === ts.SyntaxKind.CaretEqualsToken
		}
		else if (ts.isPostfixUnaryExpression(node)) {
			return node.operator === ts.SyntaxKind.PlusPlusToken
				|| node.operator === ts.SyntaxKind.MinusMinusToken
		}
		else if (ts.isPrefixUnaryExpression(node)) {
			return node.operator === ts.SyntaxKind.PlusPlusToken
				|| node.operator === ts.SyntaxKind.MinusMinusToken
		}

		return false
	}

	/** get the expression assigning to. */
	function getAssigningExpression(node: AssigningNode): TS.Expression {
		if (ts.isBinaryExpression(node)) {
			return node.left
		}
		else {
			return node.operand
		}
	}

	/** get the accessing part from assigning expression. */
	export function getPropertyAssigning(node: AssigningNode): PropertyAccessingNode | null {
		let exp = getAssigningExpression(node)
		if (isPropertyAccessing(exp)) {
			return exp
		}

		return null
	}



	//// Types

	/** Get full text of a type, all type parameters are included. */
	export function getTypeFullText(type: TS.Type): string {
		return typeChecker.typeToString(type)
	}

	/** Get the name of a type, all type parameters are excluded. */
	export function getTypeName(type: TS.Type): string | undefined {
		let node = typeChecker.typeToTypeNode(type, undefined, undefined)
		if (!node || !ts.isTypeReferenceNode(node)) {
			return undefined
		}

		let typeName = node.typeName
		if (!ts.isIdentifier(typeName)) {
			return undefined
		}

		return typeName.text
	}

	/** Get full text of the type of a node, all type parameters are included. */
	export function getNodeTypeFullText(node: TS.Node): string {
		return getTypeFullText(typeChecker.getTypeAtLocation(node))
	}

	/** Get the name of the type of a node, all type parameters are excluded. */
	export function getNodeTypeName(node: TS.Node): string | undefined {
		return getTypeName(typeChecker.getTypeAtLocation(node))
	}

	/** Get the returned type of a method / function declaration. */
	export function getNodeReturnType(node: TS.SignatureDeclaration): TS.Type | undefined {
		let signature = typeChecker.getSignatureFromDeclaration(node)
		if (!signature) {
			return undefined
		}

		return signature.getReturnType()
	}

	/** Test whether type of a node is primitive. */
	export function isNodeObjectType(node: TS.Node): boolean {
		let type = typeChecker.getTypeAtLocation(node)
		return (type.getFlags() & ts.TypeFlags.Object) > 0
	}

	/** Test whether type of a node extends `Array<any>`. */
	export function isNodeArrayType(node: TS.Node): boolean {
		let type = typeChecker.getTypeAtLocation(node)
		return typeChecker.isArrayType(type)
	}

	/** Analysis whether a property access expression is readonly. */
	export function isPropertyReadonly(node: TS.PropertyAccessExpression | TS.ElementAccessExpression): boolean {

		// `class A{readonly p}` -> `p` and `this['p']` are readonly.
		// `interface A{readonly p}` -> `p` and `this['p']` are readonly.
		let nameDecl = resolveProperty(node)
		if (nameDecl && nameDecl.modifiers?.find(m => m.kind === ts.SyntaxKind.ReadonlyKeyword)) {
			return true
		}

		// `b: Readonly<{p: 1}>` -> `b.p` is readonly, not observed.
		// `c: ReadonlyArray<...>` -> `c.?` is readonly, not observed.
		// `d: DeepReadonly<...>` -> `d.?` and `d.?.?` are readonly, not observed.
		let exp = node.expression
		let type = typeChecker.getTypeAtLocation(exp)
		let name = getTypeName(type)

		if (name === 'Readonly' || name === 'ReadonlyArray') {
			return true
		}

		return false
	}



	//// Symbol & Resolving

	/** Test whether current class or super class implements a type located at a module. */
	export function isNodeImportedFrom(node: TS.TypeNode, typeName: string, moduleName: string): boolean {
		let nm = resolveImport(node)
		return !!(nm && nm.name === typeName && nm.module === moduleName)
	}

	/** Resolve the import name and module. */
	export function resolveImport(node: TS.Node): {name: string, module: string} | undefined {

		// `import * as M`, and use it's member like `M.member`.
		if (ts.isPropertyAccessExpression(node)) {
			let name = node.name.getText()
			let symbol = resolveNodeSymbol(node.expression)
			let decl = symbol ? resolveOneSymbolDeclaration(symbol, ts.isNamespaceImport) : undefined

			if (decl) {
				let moduleNameNode = decl.parent.parent.moduleSpecifier
				let moduleName = ts.isStringLiteral(moduleNameNode) ? moduleNameNode.text : ''

				return {
					name,
					module: moduleName,
				}
			}
		}
		else {
			let symbol = resolveNodeSymbol(node)
			let decl = symbol ? resolveOneSymbolDeclaration(symbol, ts.isImportSpecifier) : undefined

			if (decl) {
				let moduleNameNode = decl.parent.parent.parent.moduleSpecifier
				let moduleName = ts.isStringLiteral(moduleNameNode) ? moduleNameNode.text : ''

				return {
					name: (decl.propertyName || decl.name).text,
					module: moduleName,
				}
			}
		}

		return undefined
	}

	/** Get the symbol of a given node. */
	export function resolveNodeSymbol(node: TS.Node, resolveAlias: boolean = false): TS.Symbol | undefined {
		let symbol = typeChecker.getSymbolAtLocation(node)

		// Get symbol from identifier.
		if (!symbol && !ts.isIdentifier(node)) {
			let identifier = getIdentifier(node)
			symbol = identifier ? typeChecker.getSymbolAtLocation(identifier) : undefined
		}

		// Resolve aliased symbols to it's original declared place.
		if (resolveAlias && symbol && (symbol.flags & ts.SymbolFlags.Alias) > 0) {
			symbol = typeChecker.getAliasedSymbol(symbol)
		}

		return symbol
	}

	/** Returns the identifier, like variable or declaration name of a given node if possible. */
	export function getIdentifier(node: TS.Node): TS.Identifier | undefined {

		// Variable.
		if (ts.isIdentifier(node)) {
			return node
		}

		// Declaration of a class or interface, property, method, function name, get or set name.
		if ((ts.isClassLike(node)
			|| ts.isInterfaceDeclaration(node)
			|| ts.isVariableDeclaration(node)
			|| ts.isMethodDeclaration(node)
			|| ts.isPropertyDeclaration(node)
			|| ts.isFunctionDeclaration(node)
			|| ts.isGetAccessorDeclaration(node)
			|| ts.isSetAccessorDeclaration(node)
			)
			&& node.name
			&& ts.isIdentifier(node.name)
		) {
			return node.name
		}

		// Identifier of type expression.
		if (ts.isTypeReferenceNode(node)
			&& ts.isIdentifier(node.typeName)
		) {
			return node.typeName
		}

		return undefined
	}

	/** Resolves the declarations of a node. */
	export function resolveDeclarations<T extends TS.Declaration>(node: TS.Node, test?: (node: TS.Node) => node is T): T[] | undefined {
		let symbol = resolveNodeSymbol(node, true)
		if (!symbol) {
			return undefined
		}

		let decls = symbol.getDeclarations()
		if (test && decls) {
			decls = decls.filter(decl => test(decl))
		}

		return decls as T[]
	}

	/** Resolves the first declaration of a node, in kind. */
	export function resolveOneDeclaration<T extends TS.Node>(node: TS.Node, test: (node: TS.Node) => node is T): T | undefined {
		let decls = resolveDeclarations(node)
		return decls?.find(test) as T | undefined
	}

	/** Resolves the first declaration of a symbol, in kind. */
	export function resolveOneSymbolDeclaration<T extends TS.Node>(symbol: TS.Symbol, test: (node: TS.Node) => node is T): T | undefined {
		let decls = symbol.getDeclarations()
		return decls?.find(test) as T | undefined
	}

	/** Resolve a property declaration or signature. */
	export function resolveProperty(node: TS.PropertyAccessExpression | TS.ElementAccessExpression):
		TS.PropertySignature | TS.PropertyDeclaration | undefined
	{
		let name = ts.isPropertyAccessExpression(node) ? node.name : node.argumentExpression

		let testFn = ((node: TS.Node) => ts.isPropertySignature(node) || ts.isPropertyDeclaration(node)) as
			((node: TS.Node) => node is TS.PropertySignature | TS.PropertyDeclaration)

		return resolveOneDeclaration(name, testFn)
	}

	/** Resolve a property or get accessor declaration or signature. */
	export function resolvePropertyOrGetAccessor(node: TS.PropertyAccessExpression | TS.ElementAccessExpression):
		TS.PropertySignature | TS.PropertyDeclaration | TS.GetAccessorDeclaration | undefined
	{
		let name = ts.isPropertyAccessExpression(node) ? node.name : node.argumentExpression

		let testFn = ((node: TS.Node) => {
			return ts.isPropertySignature(node)
				|| ts.isPropertyDeclaration(node)
				|| ts.isPropertyDeclaration(node)
		}) as ((node: TS.Node) => node is TS.PropertySignature | TS.PropertyDeclaration | TS.GetAccessorDeclaration)

		return resolveOneDeclaration(name, testFn)
	}

	/** Resolve a method declaration or signature. */
	export function resolveMethod(node: TS.PropertyAccessExpression | TS.ElementAccessExpression): TS.MethodSignature | TS.MethodDeclaration | undefined {
		let name = ts.isPropertyAccessExpression(node) ? node.name : node.argumentExpression

		let testFn = ((node: TS.Node) => ts.isMethodSignature(node) || ts.isMethodDeclaration(node)) as
			((node: TS.Node) => node is TS.MethodSignature | TS.MethodDeclaration)

		return resolveOneDeclaration(name, testFn)
	}

	/** Resolve a method or function declaration or a signature. */
	export function resolveCallDeclaration(node: TS.CallExpression):
		TS.MethodSignature | TS.MethodDeclaration | TS.FunctionDeclaration | TS.ArrowFunction | undefined
	{
		let testFn = (<T extends TS.Node>(node: T) => {
			return ts.isMethodDeclaration(node)
				|| ts.isMethodSignature(node)
				|| ts.isFunctionDeclaration(node)
				|| ts.isArrowFunction(node)
		}) as ((node: TS.Node) => node is TS.MethodSignature | TS.MethodDeclaration | TS.FunctionDeclaration | TS.ArrowFunction)

		return resolveOneDeclaration(node.expression, testFn)
	}
}