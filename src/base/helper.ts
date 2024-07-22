import type TS from 'typescript'
import {factory, printer, sourceFile, transformContext, ts, typeChecker} from './global'


/** Property or element access types. */
export type AccessNode = TS.PropertyAccessExpression | TS.ElementAccessExpression

/** Property access types. */
export type AssignmentNode = TS.BinaryExpression | TS.PostfixUnaryExpression | TS.PrefixUnaryExpression

/** Resolved names after resolve importing of a node. */
export interface ResolvedImportNames {
	memberName: string
	moduleName: string
}


/** Help to get and check. */
export namespace helper {


	//// Global, all node shared

	/** Get node text, can output from a newly created node. */
	export function getText(node: TS.Node) {
		if (node.pos >= 0) {
			try {
				return node.getText()
			}
			catch (err) {
				return printer.printNode(ts.EmitHint.Unspecified, node, sourceFile)
			}
		}
		else {
			return printer.printNode(ts.EmitHint.Unspecified, node, sourceFile)
		}
	}



	/** Decorator Part */
	export namespace deco {

		/** Get the first decorator from a class declaration, a property or method declaration. */
		export function getFirst(node: TS.ClassDeclaration | TS.MethodDeclaration | TS.PropertyDeclaration): TS.Decorator | undefined {
			return node.modifiers?.find(m => ts.isDecorator(m)) as TS.Decorator | undefined
		}

		/** Get the first decorator name of a decorator. */
		export function getName(node: TS.Decorator): string | undefined {
			let exp = node.expression

			let identifier = ts.isCallExpression(exp) 
				? exp.expression
				: exp

			if (!ts.isIdentifier(identifier)) {
				return undefined
			}

			let resolved = symbol.resolveImport(exp)
			if (resolved) {
				return resolved.memberName
			}

			let decl = symbol.resolveDeclaration(identifier, ts.isFunctionDeclaration)
			if (!decl) {
				return undefined
			}

			return decl.name?.text
		}

		/** Get the first decorator from a class declaration, a property or method declaration. */
		export function getFirstName(node: TS.ClassDeclaration | TS.MethodDeclaration | TS.PropertyDeclaration): string | undefined {
			let decorator = getFirst(node)
			let decoName = decorator ? getName(decorator) : undefined

			return decoName
		}
	}



	/** Class part */
	export namespace cls {

		/** 
		 * Get name of a class member.
		 * For a constructor function, it returns `constructor`
		 */
		export function getMemberName(node: TS.ClassElement): string {
			if (ts.isConstructorDeclaration(node)) {
				return 'constructor'
			}
			else {
				return getText(node.name!)
			}
		}

		/** 
		 * Get one class property declaration by it's name.
		 * `followExtend` specifies whether will look at extended class.
		 */
		export function getProperty(node: TS.ClassDeclaration, propertyName: string, followExtend: boolean = false): TS.PropertyDeclaration | undefined {
			if (followExtend) {
				let prop = getProperty(node, propertyName, false)
				if (prop) {
					return prop
				}

				let superClass = getSuper(node)
				if (superClass) {
					return getProperty(superClass, propertyName, followExtend)
				}

				return undefined
			}
			else {
				return node.members.find(m => {
					return ts.isPropertyDeclaration(m)
						&& getMemberName(m) === propertyName
				}) as TS.PropertyDeclaration | undefined
			}
		}

		/** 
		 * Get one class method declaration by it's name.
		 * `followExtend` specifies whether will look at extended class.
		 */
		export function getMethod(node: TS.ClassDeclaration, methodName: string, followExtend: boolean = false): TS.MethodDeclaration | undefined {
			if (followExtend) {
				let prop = getMethod(node, methodName, false)
				if (prop) {
					return prop
				}

				let superClass = getSuper(node)
				if (superClass) {
					return getMethod(superClass, methodName, followExtend)
				}

				return undefined
			}
			else {
				return node.members.find(m => {
					return ts.isMethodDeclaration(m)
						&& getMemberName(m) === methodName
				}) as TS.MethodDeclaration | undefined
			}
		}

		/** Get super class declaration. */
		export function getSuper(node: TS.ClassDeclaration): TS.ClassDeclaration | undefined {
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
			let superClass = symbol.resolveDeclaration(exp, ts.isClassDeclaration)

			return superClass as TS.ClassDeclaration | undefined
		}

		/** Test whether is derived class of a specified named class, and of specified module. */
		export function isDerivedOf(node: TS.ClassDeclaration, declName: string, moduleName: string): boolean {
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

			let resolved = symbol.resolveImport(exp)
			if (resolved) {
				if (resolved.moduleName === moduleName && resolved.memberName === declName) {
					return true
				}
			}

			let superClass = symbol.resolveDeclaration(exp, ts.isClassDeclaration)
			if (superClass) {
				return isDerivedOf(superClass, declName, moduleName)
			}

			return false
		}

		/** Test whether class or super class implements a type with specified name and located at specified module. */
		export function isImplemented(node: TS.ClassDeclaration, typeName: string, moduleName: string): boolean {
			let implementClauses = node.heritageClauses?.find(h => {
				return h.token === ts.SyntaxKind.ImplementsKeyword
			})

			if (implementClauses) {
				let implementModules = implementClauses.types.find(type => {
					let resolved = symbol.resolveImport(type.expression)
					return resolved && resolved.memberName === typeName && resolved.moduleName === moduleName
				})

				if (implementModules) {
					return true
				}
			}

			let superClass = getSuper(node)
			if (!superClass) {
				return false
			}

			return isImplemented(superClass, typeName, moduleName)
		}

		/** Get constructor. */
		export function getConstructor(node: TS.ClassDeclaration): TS.ConstructorDeclaration | undefined {
			return node.members.find(v => ts.isConstructorDeclaration(v)) as TS.ConstructorDeclaration | undefined
		}

		/** Get constructor parameter list, even from super class. */
		export function getConstructorParameters(node: TS.ClassDeclaration): TS.ParameterDeclaration[] {
			let constructor = getConstructor(node)
			if (constructor) {
				return [...constructor.parameters]
			}
			
			let superClass = getSuper(node)
			if (superClass) {
				return getConstructorParameters(superClass)
			}

			return []
		}

		/** Whether property or method has specified modifier. */
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
	}



	/** Property Access. */
	export namespace access {

		/** Whether be accessing like `a.b` or `a[b]`. */
		export function isAccess(node: TS.Node): node is AccessNode {
			return ts.isPropertyAccessExpression(node)
				|| ts.isElementAccessExpression(node)
		}

		/** get accessing name node. */
		export function getNameNode(node: AccessNode): TS.Expression {
			return ts.isPropertyAccessExpression(node)
				? node.name
				: node.argumentExpression
		}

		/** get property accessing name. */
		export function getNameText(node: AccessNode): string{
			return getText(getNameNode(node))
		}
	}



	/** Property Assignment */
	export namespace assign {

		/** Whether be property assignment like `a = x`. */
		export function isAssignment(node: TS.Node): node is AssignmentNode {
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
					|| node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandEqualsToken
					|| node.operatorToken.kind === ts.SyntaxKind.BarEqualsToken
					|| node.operatorToken.kind === ts.SyntaxKind.BarBarEqualsToken
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

		/** 
		 * get the value assigning from.
		 * `b` of `a = b`
		 */
		export function getFrom(node: AssignmentNode): TS.Expression {
			if (ts.isBinaryExpression(node)) {
				return node.right
			}
			else {
				return node.operand
			}
		}


		/** 
		 * get the expressions assigning to.
		 * `a` of `a = b`
		 * `a, b` of `[a, b] = c`
		 */
		export function getToExpressions(node: AssignmentNode): TS.Expression[] {
			if (ts.isBinaryExpression(node)) {
				return [...walkAssignToExpressions(node.left)]
			}
			else {
				return [node.operand]
			}
		}

		/** Walk for  */
		function* walkAssignToExpressions(node: TS.Expression): Iterable<TS.Expression> {
			if (ts.isArrayLiteralExpression(node)) {
				for (let el of node.elements) {
					yield *walkAssignToExpressions(el)
				}
			}
			else if (ts.isObjectLiteralExpression(node)) {
				for (let prop of node.properties) {
					if (ts.isPropertyAssignment(prop)) {
						yield *walkAssignToExpressions(prop.initializer)
					}
				}
			}
			else {
				yield node
			}
		}
	}



	/** Variable declarations. */
	export namespace variable {

		/** Test whether a node is an variable name identifier. */
		export function isVariableIdentifier(node: TS.Node): node is TS.Identifier {
			if (!ts.isIdentifier(node)) {
				return false
			}

			if (node.parent
				&& ts.isPropertyAccessExpression(node.parent)
				&& node === access.getNameNode(node.parent)
			) {
				return false
			}

			return true
		}

		/** Walk for all declared variable names from a variable declaration. */
		export function* walkDeclarationNames(node: TS.VariableDeclaration): Iterable<string> {

			// `{a} = ...`
			// `[a] = ...`
			if (ts.isObjectBindingPattern(node.name)
				|| ts.isArrayBindingPattern(node.name)
			) {
				yield *walkVariablePatternNames(node.name)
			}
			else if (ts.isIdentifier(node.name)) {
				yield helper.getText(node.name)
			}
		}

		/** Get all declared variable name from a variable pattern. */
		function* walkVariablePatternNames(node: TS.ObjectBindingPattern | TS.ArrayBindingPattern): Iterable<string> {
			for (let element of node.elements as TS.NodeArray<TS.BindingElement>) {
				if (ts.isObjectBindingPattern(element.name)
					|| ts.isArrayBindingPattern(element.name)
				) {
					yield *walkVariablePatternNames(element.name)
				}
				else if (ts.isIdentifier(element.name)) {
					yield helper.getText(element.name)
				}
			}
		}
	}


	
	/** Type part */
	export namespace types {

		/** Get type of a node. */
		export function getType(node: TS.Node): TS.Type {
			return typeChecker.getTypeAtLocation(node)
		}

		/** Get type node of a node. */
		export function getTypeNode(node: TS.Node): TS.TypeNode | undefined {
			return typeToTypeNode(getType(node))
		}

		/** Get type node of a type. */
		export function typeToTypeNode(type: TS.Type): TS.TypeNode | undefined {
			return typeChecker.typeToTypeNode(type, undefined, undefined)
		}

		/** Get full text of a type, all type parameters are included. */
		export function getTypeFullText(type: TS.Type): string {
			return typeChecker.typeToString(type)
		}

		/** Get the reference name of a type node, all type parameters are excluded. */
		export function getTypeNodeReferenceName(node: TS.TypeNode): string | undefined {
			if (!ts.isTypeReferenceNode(node)) {
				return undefined
			}

			let typeName = node.typeName
			if (!ts.isIdentifier(typeName)) {
				return undefined
			}

			return typeName.text
		}

		/** Get the returned type of a method / function declaration. */
		export function getReturnType(node: TS.SignatureDeclaration): TS.Type | undefined {
			let signature = typeChecker.getSignatureFromDeclaration(node)
			if (!signature) {
				return undefined
			}

			return signature.getReturnType()
		}

		/** Test whether type is object. */
		export function isObjectType(type: TS.Type): boolean {
			if (type.isUnionOrIntersection()) {
				return type.types.every(t => isObjectType(t))
			}

			return (type.getFlags() & ts.TypeFlags.Object) > 0
		}

		/** Test whether type represents a value. */
		export function isValueType(type: TS.Type): boolean {
			if (type.isUnionOrIntersection()) {
				return type.types.every(t => isValueType(t))
			}

			return (type.getFlags() & (
				ts.TypeFlags.StringLike
					| ts.TypeFlags.NumberLike
					| ts.TypeFlags.BigIntLike
					| ts.TypeFlags.BooleanLike
					| ts.TypeFlags.ESSymbolLike
					| ts.TypeFlags.Undefined
					| ts.TypeFlags.Null
			)) > 0
		}

		/** Test whether type of a node extends `Array<any>`. */
		export function isArrayType(type: TS.Type): boolean {
			return typeChecker.isArrayType(type)
		}

		/** Analysis whether a property access expression is readonly. */
		export function isReadonly(node: AccessNode): boolean {

			// `class A{readonly p}` -> `p` and `this['p']` are readonly.
			// `interface A{readonly p}` -> `p` and `this['p']` are readonly.
			let nameDecl = symbol.resolveProperty(node)
			if (nameDecl && nameDecl.modifiers?.find(m => m.kind === ts.SyntaxKind.ReadonlyKeyword)) {
				return true
			}

			// `a: Readonly<{p: 1}>` -> `a.p` is readonly, not observe.
			// `a: ReadonlyArray<...>` -> `a.?` is readonly, not observe.
			// `a: DeepReadonly<...>` -> `a.?` and `d.?.?` are readonly, not observe.
			// `readonly {...}` -> it may not 100% strict.
			let exp = node.expression

			let typeNode = getTypeNode(exp)
			if (!typeNode) {
				return false
			}

			if (ts.isTypeReferenceNode(typeNode)) {
				let name = getTypeNodeReferenceName(typeNode)
				if (name === 'Readonly' || name === 'ReadonlyArray') {
					return true
				}
			}

			// Type was expanded and removed alias.
			else if (ts.isTypeOperatorNode(typeNode)) {
				if (typeNode.operator === ts.SyntaxKind.ReadonlyKeyword) {
					return true
				}
			}

			return false
		}

			
		/** Test whether calls `Map.has`, `Map.get` or `Set.has` */
		export function isMapOrSetReading(node: AccessNode) {
			let typeNode = getTypeNode(node.expression)
			let objName = typeNode ? getTypeNodeReferenceName(typeNode) : undefined
			let propName = helper.access.getNameText(node)

			if (objName === 'Map') {
				return propName === 'has' || propName === 'get' || propName === 'size'
			}
			else if (objName === 'Set') {
				return propName === 'has' || propName === 'size'
			}
			else {
				return false
			}
		}


		/** Test whether calls `Map.set`, or `Set.set`. */
		export function isMapOrSetWriting(node: AccessNode) {
			let typeNode = getTypeNode(node.expression)
			let objName = typeNode ? getTypeNodeReferenceName(typeNode) : undefined
			let propName = helper.access.getNameText(node)

			if (objName === 'Map') {
				return propName === 'set'
			}
			else if (objName === 'Set') {
				return propName === 'add'
			}
			else {
				return false
			}
		}

	}



	/** Symbol & Resolving */
	export namespace symbol {

		/** Test whether a node has an import name and located at a module. */
		export function isImportedFrom(node: TS.Node, memberName: string, moduleName: string): boolean {
			let nm = resolveImport(node)

			if (nm && nm.memberName === memberName && nm.moduleName === moduleName) {
				return true
			}
			else {
				return false
			}
		}

		/** Resolve the import name and module. */
		export function resolveImport(node: TS.Node): ResolvedImportNames | undefined {

			// `import * as M`, and use it's member like `M.member`.
			if (ts.isPropertyAccessExpression(node)) {
				let declName = getText(node.name)
				let symbol = resolveSymbol(node.expression, false)
				let decl = symbol ? resolveDeclarationBySymbol(symbol, ts.isNamespaceImport) : undefined

				if (decl) {
					let moduleNameNode = decl.parent.parent.moduleSpecifier
					let moduleName = ts.isStringLiteral(moduleNameNode) ? moduleNameNode.text : ''

					return {
						memberName: declName,
						moduleName,
					}
				}
			}
			else {
				let symbol = resolveSymbol(node, false)
				let decl = symbol ? resolveDeclarationBySymbol(symbol, ts.isImportSpecifier) : undefined

				if (decl) {
					let moduleNameNode = decl.parent.parent.parent.moduleSpecifier
					let moduleName = ts.isStringLiteral(moduleNameNode) ? moduleNameNode.text : ''

					return {
						memberName: (decl.propertyName || decl.name).text,
						moduleName,
					}
				}
			}

			return undefined
		}

		/** 
		 * Resolve the symbol of a given node.
		 * The symbol links to all it's declarations.
		 * 
		 * `resolveAlias` determines whether stop resolving when meet an alias declaration.
		 *  - If wanting to resolve to it's original declared place, set to `true`.
		 *  - If wanting to resolve to it's latest imported place, set to `false`.
		 * Default value is `false`.
		 */
		export function resolveSymbol(node: TS.Node, resolveAlias: boolean): TS.Symbol | undefined {
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

			// Identifier itself.
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

			// Identifier of type node.
			if (ts.isTypeReferenceNode(node)
				&& ts.isIdentifier(node.typeName)
			) {
				return node.typeName
			}

			return undefined
		}

		/** Resolves the declarations of a node. */
		export function resolveDeclarations<T extends TS.Declaration>(node: TS.Node, test?: (node: TS.Node) => node is T): T[] | undefined {
			let symbol = resolveSymbol(node, true)
			if (!symbol) {
				return undefined
			}

			let decls = symbol.getDeclarations()
			if (test && decls) {
				decls = decls.filter(decl => test(decl))
			}

			return decls as T[]
		}

		/** Resolves the first declaration from a node. */
		export function resolveDeclaration<T extends TS.Node>(node: TS.Node, test: (node: TS.Node) => node is T): T | undefined {
			let decls = resolveDeclarations(node)
			return decls?.find(test) as T | undefined
		}

		/** Resolves the first declaration from specified type. */
		export function resolveDeclarationByType<T extends TS.Node>(type: TS.Type, test: (node: TS.Node) => node is T): T | undefined {
			let symbol = type.getSymbol()
			return symbol ? resolveDeclarationBySymbol(symbol, test) : undefined
		}

		/** Resolves the first declaration from a symbol. */
		export function resolveDeclarationBySymbol<T extends TS.Node>(symbol: TS.Symbol, test: (node: TS.Node) => node is T): T | undefined {
			let decls = symbol.getDeclarations()
			return decls?.find(test) as T | undefined
		}

		/** Resolve a property declaration or signature. */
		export function resolveProperty(node: AccessNode): TS.PropertySignature | TS.PropertyDeclaration | undefined {
			let name = ts.isPropertyAccessExpression(node) ? node.name : node.argumentExpression

			let testFn = ((node: TS.Node) => ts.isPropertySignature(node) || ts.isPropertyDeclaration(node)) as
				((node: TS.Node) => node is TS.PropertySignature | TS.PropertyDeclaration)

			return resolveDeclaration(name, testFn)
		}

		/** Resolve get accessor declaration or signature. */
		export function resolvePropertyOrGetAccessor(node: AccessNode):
			TS.PropertySignature | TS.PropertyDeclaration | TS.GetAccessorDeclaration | undefined
		{
			let name = ts.isPropertyAccessExpression(node) ? node.name : node.argumentExpression

			let testFn = ((node: TS.Node) => {
				return ts.isPropertySignature(node)
					|| ts.isPropertyDeclaration(node)
					|| ts.isGetAccessorDeclaration(node)
			}) as ((node: TS.Node) => node is TS.PropertySignature | TS.PropertyDeclaration | TS.GetAccessorDeclaration)

			return resolveDeclaration(name, testFn)
		}

		/** Resolve a method declaration or signature. */
		export function resolveMethod(node: AccessNode): TS.MethodSignature | TS.MethodDeclaration | undefined {
			let name = ts.isPropertyAccessExpression(node) ? node.name : node.argumentExpression

			let testFn = ((node: TS.Node) => ts.isMethodSignature(node) || ts.isMethodDeclaration(node)) as
				((node: TS.Node) => node is TS.MethodSignature | TS.MethodDeclaration)

			return resolveDeclaration(name, testFn)
		}

		/** Resolve a method or function declaration or a signature from a calling. */
		export function resolveCallDeclaration(node: TS.CallExpression):
			TS.MethodSignature | TS.MethodDeclaration | TS.FunctionDeclaration | TS.ArrowFunction | undefined
		{
			let testFn = (<T extends TS.Node>(node: T) => {
				return ts.isMethodDeclaration(node)
					|| ts.isMethodSignature(node)
					|| ts.isFunctionDeclaration(node)
					|| ts.isArrowFunction(node)
			}) as ((node: TS.Node) => node is TS.MethodSignature | TS.MethodDeclaration | TS.FunctionDeclaration | TS.ArrowFunction)

			return resolveDeclaration(node.expression, testFn)
		}
	}



	/** Import part. */
	export namespace imports {

		/** Get import statement come from specified module name. */
		export function getImportFromModule(moduleName: string): TS.ImportDeclaration | undefined {
			return sourceFile.statements.find(st => {
				return ts.isImportDeclaration(st)
					&& ts.isStringLiteral(st.moduleSpecifier)
					&& st.moduleSpecifier.text === moduleName
					&& st.importClause?.namedBindings
					&& ts.isNamedImports(st.importClause?.namedBindings)
			}) as TS.ImportDeclaration | undefined
		}
	}



	/** factory like, re-pack nodes to get another node. */
	export namespace pack {

		/** Whether be function, method, or get/set accessor. */
		export function isFunctionLike(node: TS.Node): boolean {
			return ts.isMethodDeclaration(node)
				|| ts.isFunctionDeclaration(node)
				|| ts.isFunctionExpression(node)
				|| ts.isGetAccessorDeclaration(node)
				|| ts.isSetAccessorDeclaration(node)
				|| ts.isArrowFunction(node)
		}

		/** Whether be `return` with content, `yield`, `await`, or arrow function implicitly return. */
		export function isFlowInterruption(node: TS.Node): node is TS.ReturnStatement | TS.Expression {
			let parent = node.parent
			
			return ts.isReturnStatement(node) && !!node.expression
				|| ts.isAwaitExpression(node)
				|| ts.isYieldExpression(node)

				// Arrow function without block body.
				|| ts.isArrowFunction(parent)
					&& node === parent.body && !ts.isBlock(node)
		}

		/** 
		 * Get content of `return`, `await`, `or yield`,
		 * or return itself if is implicit return content of arrow function.
		 */
		export function getMayFlowInterruptionContent(node: TS.Expression): TS.Expression {
			if (ts.isReturnStatement(node)
				|| ts.isYieldExpression(node)
				|| ts.isAwaitExpression(node)
			) {
				return node.expression!
			}

			return node
		}

		/** Whether be a block or a source file. */
		export function canBlock(node: TS.Node): node is TS.SourceFile | TS.Block {
			return ts.isSourceFile(node)
				|| ts.isBlock(node)
		}

		/** Not a block, but can be extended to a block. */
		export function canExtendToBlock(node: TS.Node): node is TS.Expression | TS.ExpressionStatement {
			let parent = node.parent

			if (ts.isBlock(node)) {
				return false
			}

			if (ts.isArrowFunction(parent)
				&& node === parent.body
			) {
				return true
			}

			if (ts.isIfStatement(parent)
				&& (node === parent.thenStatement

					// `else if ...` if part cant be expanded.
					|| node === parent.elseStatement
						&& !ts.isIfStatement(node)
				)
			) {
				return true	
			}

			if ((ts.isForStatement(parent)
					|| ts.isForOfStatement(parent)
					|| ts.isForInStatement(parent)
					|| ts.isWhileStatement(parent)
					|| ts.isDoStatement(parent)
				)
				&& node === parent.statement
			) {
				return true
			}

			return false
		}

		/** Whether can put statements. */
		export function canPutStatements(node: TS.Node): node is TS.SourceFile | TS.Block | TS.CaseOrDefaultClause {
			return canBlock(node)
				|| ts.isCaseOrDefaultClause(node)
		}

		/** Whether can be extended to a block to put statements. */
		export function canExtendToPutStatements(node: TS.Node): node is TS.Expression | TS.ExpressionStatement {
			return canExtendToBlock(node)
		}

		/** Whether can put statements, or can be extended to a block to put statements. */
		export function canMayExtendToPutStatements(node: TS.Node):
			node is TS.SourceFile | TS.Block | TS.CaseOrDefaultClause | TS.Expression | TS.ExpressionStatement
		{
			return canPutStatements(node)
				|| canExtendToPutStatements(node)
		}

		/** 
		 * Whether the node it returns a single value for outer,
		 * or should be just one unique expression, can't be replaced to two.
		 * so that it can be parenthesized.
		 */
		export function shouldBeUnique(node: TS.Node): node is TS.Expression {
			let parent = node.parent

			// Content of flow interrupt
			if (ts.isReturnStatement(parent)
				|| ts.isAwaitExpression(parent)
				|| ts.isYieldExpression(parent)
			) {
				if (parent.expression === node) {
					return true
				}
			}

			// `if (...)`, `case(...)`
			if (ts.isIfStatement(parent) || ts.isSwitchStatement(parent)) {
				if (node === parent.expression) {
					return true
				}
			}

			// `a ? b : c`
			else if (ts.isConditionalExpression(parent)) {
				if (node === parent.condition
					|| node === parent.whenTrue
					|| node === parent.whenFalse
				) {
					return true
				}
			}

			// `a && b`, `a || b`, `a ?? b`.
			else if (ts.isBinaryExpression(parent)) {
				if ((parent.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
					|| parent.operatorToken.kind === ts.SyntaxKind.BarBarToken
					|| parent.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken)
				) {
					if (node === parent.left
						|| node === parent.right
					) {
						return true
					}
				}
			}

			// `for (;;) ...`
			else if (ts.isForStatement(parent)) {
				if (node === parent.initializer
					|| node === parent.condition
					|| node === parent.incrementor
				) {
					return true
				}
			}

			// `for ... in`, `for ... of`, `while ...`, `do ...`
			else if (ts.isForOfStatement(parent)
				|| ts.isForInStatement(parent)
				|| ts.isWhileStatement(parent)
				|| ts.isDoStatement(parent)
			) {
				if (node === parent.expression) {
					return true
				}
			}

			// `a.b`, both `a` and `b` should be an expression.
			else if (ts.isPropertyAccessExpression(parent)
				|| ts.isElementAccessExpression(parent)) {
				return true
			}

			return false
		}

		/** 
		 * Bundle expressions to a parenthesized expression.
		 * `a, b -> (a, b)`
		 */
		export function parenthesizeExpressions(...exps: TS.Expression[]): TS.Expression {

			// Only one expression, returns it.
			if (exps.length === 1) {
				return exps[0]
			}

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

		/** 
		 * For each level of nodes, extract final expressions from a parenthesized expression.
		 * `(a, b, c)` -> `c`
		 */
		export function extractFinalParenthesized(node: TS.Node): TS.Node {
			if (ts.isParenthesizedExpression(node)) {
				let exp = node.expression
				if (ts.isBinaryExpression(exp) && exp.operatorToken.kind === ts.SyntaxKind.CommaToken) {
					return extractFinalParenthesized(exp.right)
				}
			}

			return ts.visitEachChild(node, extractFinalParenthesized as any, transformContext)
		}

		/** Remove comments from a property or element access node. */
		export function removeAccessComments<T extends TS.Node>(node: T): T {
			if (ts.isPropertyAccessExpression(node)) {

				// `a?.b`
				if (node.questionDotToken) {
					return factory.createPropertyAccessChain(
						removeAccessComments(node.expression),
						node.questionDotToken,
						removeAccessComments(node.name),
					) as TS.Node as T
				}

				// `a.b`
				else {
					return factory.createPropertyAccessExpression(
						removeAccessComments(node.expression),
						removeAccessComments(node.name)
					) as TS.Node as T
				}
			}
			else if (ts.isElementAccessExpression(node)) {
				
				// `a?.[b]`
				if (node.questionDotToken) {
					return factory.createElementAccessChain(
						removeAccessComments(node.expression),
						node.questionDotToken,
						removeAccessComments(node.argumentExpression),
					) as TS.Node as T
				}

				// `a[b]`
				else {
					return factory.createElementAccessExpression(
						removeAccessComments(node.expression),
						removeAccessComments(node.argumentExpression)
					) as TS.Node as T
				}
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
		 * Replace property access node to a reference.
		 * `a.b().c -> _ref_.c`
		 */
		export function replaceReferencedAccess(node: AccessNode, exp: TS.Expression): AccessNode {
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

		/** Wrap by a statement if not yet. */
		export function toStatement(node: TS.Node): TS.Statement {
			if (ts.isStatement(node)) {
				return node
			}
			else if (ts.isVariableDeclarationList(node)) {
				return factory.createVariableStatement(undefined, node)
			}
			else if (ts.isExpression(node)) {
				return factory.createExpressionStatement(node)
			}
			else {
				throw new Error(`Don't know how to pack "${getText(node)}" to a statement!`)
			}
		}

		/** Wrap by a statement if not yet. */
		export function restoreFlowInterruption(content: TS.Expression, rawNode: TS.ReturnStatement | TS.Expression): TS.Expression | TS.Statement {
			if (ts.isReturnStatement(rawNode)) {
				return factory.createReturnStatement(content)
			}
			else if (ts.isYieldExpression(rawNode)) {
				return factory.createYieldExpression(rawNode.asteriskToken!, content)
			}
			else if (ts.isAwaitExpression(content)) {
				return factory.createAwaitExpression(content)
			}

			return content
		}

		/** 
		 * Try to clean a node to remove all not-necessary nodes,
		 * and convert multiple ways of describing a node to a unique way.
		 * like remove as expression, or unpack parenthesized, element access to property access.
		 * `deeply` determines whether simplify all descendants.
		 */
		export function normalize(node: TS.Node, deeply: boolean): TS.Node {
			if (ts.isAsExpression(node) || ts.isParenthesizedExpression(node)) {
				return normalize(node.expression, deeply)
			}

			// a['prop'] -> a.prop
			else if (ts.isElementAccessExpression(node)
				&& ts.isStringLiteral(node.argumentExpression)
				&& /^[\w\$_][\w\$_\d]*$/.test(node.argumentExpression.text)
			) {

				// `a?.b`
				if (node.questionDotToken) {
					return factory.createPropertyAccessChain(
						normalize(node.expression, deeply) as TS.Expression,
						node.questionDotToken,
						factory.createIdentifier(node.argumentExpression.text)
					)
				}

				// `a.b`
				else {
					return factory.createPropertyAccessExpression(
						normalize(node.expression, deeply) as TS.Expression,
						factory.createIdentifier(node.argumentExpression.text)
					)
				}
			}

			// '...' -> "..."
			else if (ts.isStringLiteral(node)) {
				return factory.createStringLiteral(node.text)
			}

			else if (deeply) {
				return ts.visitEachChild(node, (node: TS.Node) => normalize(node, true), transformContext)
			}
			else {
				return node
			}
		}
	}
}