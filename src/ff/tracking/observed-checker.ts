import type TS from 'typescript'
import {AccessNode} from '../../core/helper'
import {ts, Helper, typeChecker} from '../../core'
import {TrackingScopeTree} from './scope-tree'
import {GenericType} from 'typescript'


/** 
 * Types than can be or may need be observed, normally accessing, property, or call expression.
 * Still don't know about whether should observe, needs further checking.
 * 
 * Check only expressions, never check data constructing and destructing, e.g.:
 * `var a = {b: observed}; var c = a.b`
 * `{b: observed}['b']`
 * `var a = [observed]; var b = a[0]`
 * `[observed][0]`
 */
export type CanObserveNode = AccessNode
	| TS.Identifier | TS.ThisExpression
	| TS.CallExpression | TS.ParenthesizedExpression
	| TS.BinaryExpression | TS.ConditionalExpression
	| TS.AsExpression

	
/** Help to check observed state. */
export namespace ObservedChecker {

	/** Whether a type node represented node should be observed. */
	export function isTypeNodeObserved(typeNode: TS.TypeNode): boolean {

		// A | B
		if (ts.isUnionTypeNode(typeNode)
			|| ts.isIntersectionTypeNode(typeNode)
		) {
			return typeNode.types.some(n => isTypeNodeObserved(n))
		}

		// A[]
		if (ts.isArrayTypeNode(typeNode)) {
			return isTypeNodeObserved(typeNode.elementType)
		}

		// `Observed<>`, must use it directly.
		if (Helper.symbol.isImportedFrom(typeNode, 'Observed', '@pucelle/ff')) {
			return true
		}

		let resolveFrom: TS.Node = typeNode

		// Resolve type reference name.
		if (ts.isTypeReferenceNode(typeNode)) {
			resolveFrom = typeNode.typeName
		}

		let decl = Helper.symbol.resolveDeclaration(resolveFrom)
		if (!decl) {
			return false
		}

		return isTypeOrTypeNodeResolvedObserved(decl)
	}


	/** 
	 * Whether a type should be observed.
	 * A newly made `TypeNode` can't resolve symbol and declaration,
	 * so need the type observed checker.
	 */
	export function isTypeObserved(type: TS.Type): boolean {

		// A | B, A & B
		if (type.isUnionOrIntersection()) {
			return type.types.some(t => isTypeObserved(t))
		}

		// A[]
		if (typeChecker.isArrayType(type)) {
			let parameter = (type as GenericType).typeParameters?.[0]
			if (parameter) {
				return isTypeObserved(parameter)
			}
			else {
				return false
			}
		}

		let symbol = type.getSymbol()
		if (!symbol) {
			return false
		}

		let decl = Helper.symbol.resolveDeclarationBySymbol(symbol)
		if (!decl) {
			return false
		}

		return isTypeOrTypeNodeResolvedObserved(decl)
	}


	/** Whether a type or type node resolved declaration should be observed. */
	function isTypeOrTypeNodeResolvedObserved(decl: TS.Node): boolean {
		if (!decl) {
			return false
		}

		// Resolve type reference to type decl.
		if (ts.isTypeParameterDeclaration(decl)) {
			if (decl.constraint) {
				return isTypeNodeObserved(decl.constraint)
			}
		}

		// `Component` like.
		if (ts.isClassDeclaration(decl)
			&& Helper.cls.isImplemented(decl, 'Observed', '@pucelle/ff')
		) {
			return true 
		}

		return false
	}


	/** Whether a variable declaration should be observed. */
	export function isVariableDeclarationObserved(rawNode: TS.VariableDeclaration): boolean {
		// `var a = {b:1} as Observed<{b: number}>`, observed.
		// `var a: Observed<{b: number}> = {b:1}`, observed.
		// Note here: `Observed` must appear directly, reference or alias is not working.

		let typeNode = rawNode.type
		if (typeNode && isTypeNodeObserved(typeNode)) {
			return true
		}

		let type = Helper.types.typeOf(rawNode)
		if (type && isTypeObserved(type)) {
			return true
		}

		// `var a = b.c`.
		if (rawNode.initializer && isObserved(rawNode.initializer)) {
			return true
		}

		return false
	}


	/** Whether destructed variable declaration should be observed. */
	export function isDestructedVariableDeclarationObserved(rawNode: TS.Node, initializerObserved: boolean): boolean {

		// Property declaration has specified as observed type or has observed initializer.
		if (isPropertyDeclaredAsObserved(rawNode)) {
			return true
		}

		// Typescript lib.
		if (Helper.symbol.isOfTypescriptLib(rawNode)) {
			return false
		}
		
		return initializerObserved
	}


	/** 
	 * Check whether a property or get accessor resolve from node has been declared as observed.
	 * It ignores modifiers, only check declaration type.
	 */
	function isPropertyDeclaredAsObserved(rawNode: TS.Node): boolean {

		// `class A{p: Observed}` -> `this.p` and `this['p']` is observed.
		// `interface A{p: Observed}` -> `this.p` and `this['p']` is observed.
		let propDecl = Helper.symbol.resolveDeclaration(rawNode, Helper.isPropertyOrGetAccessor)
		if (!propDecl) {
			return false
		}

		// `class A{p: Observed<...>}`
		let typeNode = propDecl.type
		if (typeNode && isTypeNodeObserved(typeNode)) {
			return true
		}

		// Return type of declaration.
		if (ts.isGetAccessorDeclaration(propDecl)) {
			let returnType = Helper.types.getReturnType(propDecl)
			if (returnType &&isTypeObserved(returnType)) {
				return true
			}
		}

		// `class A{p = {} as Observed}`, must not specified property type.
		if (!typeNode
			&& ts.isPropertyDeclaration(propDecl)
			&& propDecl.initializer
			&& isObserved(propDecl.initializer)
		) {
			return true
		}

		return false
	}


	/** Broadcast observed from parent calling expression to all parameters. */
	function isParameterObservedByCallingBroadcasted(rawNode: TS.ParameterDeclaration): boolean {

		// `a.b.map((item) => {return item.value})`
		// `a.b.map(item => item.value)`
		// `a.b.map(function(item){return item.value})`
		
		let fn = rawNode.parent
		if (!(ts.isFunctionExpression(fn)
			|| ts.isArrowFunction(fn)
		)) {
			return false
		}

		// Now enters parent scope.
		let calling = fn.parent
		if (!ts.isCallExpression(calling)) {
			return false
		}

		// `a.b.map`
		let exp = calling.expression
		if (!Helper.access.isAccess(exp)) {
			return false
		}

		// `a.b`
		let callFrom = exp.expression
		if (!Helper.isListStruct(callFrom)) {
			return false
		}

		// Must use parent scope.
		return isObserved(callFrom)
	}


	/** Whether parameter declaration should be observed. */
	export function isParameterObserved(rawNode: TS.ParameterDeclaration): boolean {
		let typeNode = rawNode.type
		if (typeNode && isTypeNodeObserved(typeNode)) {
			return true
		}

		if (isParameterObservedByCallingBroadcasted(rawNode)) {
			return true
		}

		if (rawNode.initializer && isObserved(rawNode.initializer)) {
			return true
		}

		return false
	}

	
	/** 
	 * Returns whether any of following type of node should be observed:
	 * - an identifier
	 * - this
	 * - a property accessing
	 * - a new expression
	 * - a call expression
	 * - a binary expression
	 * - a conditional expression
	 * - an as expression
	 * 
	 * `parental` specifies whether are visiting parent node of original to determine observed.
	 */
	export function isObserved(rawNode: TS.Node, parental: boolean = false): rawNode is CanObserveNode {

		// `a.b`
		// `(a ? b : c).d`
		// `(a ?? b).b`
		if (Helper.access.isAccess(rawNode)) {
			return isAccessObserved(rawNode, parental)
		}

		// `this`
		// `a`
		else if (Helper.isThis(rawNode)
			|| Helper.isVariableIdentifier(rawNode)
		) {
			return isIdentifierObserved(rawNode as TS.Identifier | TS.ThisExpression)
		}

		// `a && b`, `a || b`, `a ?? b`, can observe only if both a & b can observe.
		else if (ts.isBinaryExpression(rawNode)) {
			return (rawNode.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
					|| rawNode.operatorToken.kind === ts.SyntaxKind.BarBarToken
					|| rawNode.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
				)
				&& isObserved(rawNode.left, parental)
				&& isObserved(rawNode.right, parental)
		}

		// `(...)`
		else if (ts.isParenthesizedExpression(rawNode)) {
			return isObserved(rawNode.expression, parental)
		}

		// `...!`
		else if (ts.isNonNullExpression(rawNode)) {
			return isObserved(rawNode.expression, parental)
		}

		// `(a as Observed<{b: number}>).b`
		else if (ts.isAsExpression(rawNode)) {
			let typeNode = rawNode.type
			return typeNode && Helper.symbol.isImportedFrom(typeNode, 'Observed', '@pucelle/ff')
		}

		// `a ? b : c`, can observe only if both b & c can observe.
		else if (ts.isConditionalExpression(rawNode)) {
			return isObserved(rawNode.whenTrue, parental)
				&& isObserved(rawNode.whenFalse, parental)
		}

		// `a.b()`
		else if (ts.isCallExpression(rawNode)) {
			return isCallObserved(rawNode)
		}

		// `new a()`
		else if (ts.isNewExpression(rawNode)
			&& (ts.isIdentifier(rawNode.expression)
				|| ts.isClassExpression(rawNode.expression)
			)
		) {
			return isInstanceObserved(rawNode.expression)
		}

		else {
			return false
		}
	}


	/** 
	 * Returns whether a property accessing should be observed, for internal use only.
	 * `parental` specifies whether are visiting parent node of original to determine observed.
	 */
	export function isAccessObserved(rawNode: AccessNode, parental: boolean = false): boolean {

		// `[]`, `Map`, `Set`.
		if (Helper.isListStruct(rawNode.expression)) {
			return isObserved(rawNode.expression, true)
		}

		// Typescript lib.
		if (Helper.symbol.isOfTypescriptLib(rawNode)) {
			return false
		}

		// Only check when directly visiting the node.
		if (!parental) {

			// Will not observe private property like `a.#b`.
			if (ts.isPropertyAccessExpression(rawNode) && ts.isPrivateIdentifier(rawNode.name)) {
				return false
			}

			// Will not observe property starts with '$' like `a.$b`.
			if (Helper.access.getPropertyText(rawNode).startsWith('$')) {
				return false
			}

			// Ignore get and set accessor, except `@computed` decorated.
			let decl = Helper.symbol.resolveDeclaration(rawNode, ts.isAccessor)
			if (decl) {
				let decoName = Helper.deco.getFirstName(decl)
				if (decoName !== 'computed') {
					return false
				}
			}

			// Readonly properties are not observe.
			let readonly = Helper.types.isReadonly(rawNode)
			if (readonly) {
				return false
			}
		}

		// When visiting parental nodes.
		else {

			// Property declaration has specified as observed type or observed initializer.
			if (isPropertyDeclaredAsObserved(rawNode)) {
				return true
			}
		}

		// Take `node = a.b.c` as example, exp is `a.b`.
		let exp = rawNode.expression
		let expType = typeChecker.getTypeAtLocation(exp)

		// Visiting like string index will not get observed.
		if (Helper.types.isValueType(expType)) {
			return false
		}

		// Method declarations will always not been observe.
		if (Helper.symbol.resolveDeclaration(rawNode, Helper.isMethodLike)) {
			return false
		}

		// Resolve by type, try to get a class declaration.
		// If class is not implemented from `Observed`, should not observe.
		// Note here it can't recognize class like type declarations:
		// `interface A`
		// `interface AConstructor{new(): A}`
		// This codes get commented, so no matter what class instance,
		// once it appears as a property, it will be observed.
		// let clsDecl = helper.symbol.resolveDeclarationByType(type, ts.isClassDeclaration)
		// if (clsDecl && !helper.cls.isImplemented(clsDecl, 'Observed', '@pucelle/ff')) {
		// 	return false
		// }

		return isObserved(exp, true)
	}


	/** 
	 * Check whether an identifier or `this` should be observed.
	 * Node must be the top most property access expression.
	 * E.g., for `a.b.c`, sub identifier `b` or `c` is not allowed.
	 */
	export function isIdentifierObserved(rawNode: TS.Identifier | TS.ThisExpression): boolean {
		let scope = TrackingScopeTree.findClosestByNode(rawNode)

		if (Helper.isThis(rawNode)) {
			return scope.variables.thisObserved
		}

		let name = rawNode.text
		return scope.variables.isVariableObserved(name)
	}

	
	/** Returns whether a call expression returned result should be observed. */
	function isCallObserved(rawNode: TS.CallExpression): boolean {
		let decl = Helper.symbol.resolveDeclaration(rawNode.expression, Helper.isFunctionLike)
		if (!decl) {
			return false
		}

		// Test call method returned type node.
		let returnTypeNode = decl.type
		if (returnTypeNode && isTypeNodeObserved(returnTypeNode)) {
			return true
		}

		// Test call method returned type.
		let returnType = Helper.types.getReturnType(decl)
		if (returnType && isTypeObserved(returnType)) {
			return true
		}

		return false
	}


	/** Returns whether instance of a reference of a class is observed. */
	function isInstanceObserved(rawNode: TS.Identifier | TS.ClassExpression): boolean {
		let clsDecl = Helper.symbol.resolveDeclaration(rawNode, ts.isClassDeclaration)
		if (clsDecl && Helper.cls.isImplemented(clsDecl, 'Observed', '@pucelle/ff')) {
			return true 
		}

		return false
	}


	/** Test whether calls reading process of `Map`, `Set`, `Array`. */
	export function isListStructReadAccess(rawNode: AccessNode): boolean {
		let expType = Helper.types.typeOf(rawNode.expression)
		let expTypeNode = Helper.types.getOrMakeTypeNode(rawNode.expression)
		let objName = expTypeNode ? Helper.types.getTypeNodeReferenceName(expTypeNode) : undefined
		let propName = Helper.access.getPropertyText(rawNode)

		if (objName === 'Map') {
			return propName === 'has' || propName === 'get' || propName === 'size'
		}
		else if (objName === 'Set') {
			return propName === 'has' || propName === 'size'
		}
		else if (Helper.types.isArrayType(expType)) {
			let methodDecl = Helper.symbol.resolveDeclaration(rawNode, Helper.isMethodLike)

			return !methodDecl || !(
				propName === 'push'
				|| propName === 'unshift'
				|| propName === 'sort'
				|| propName === 'splice'
			)
		}
		else {
			return false
		}
	}

	/** Test whether calls `Map.set`, or `Set.set`. */
	export function isListStructWriteAccess(rawNode: AccessNode) {
		let expType = Helper.types.typeOf(rawNode.expression)
		let expTypeNode = Helper.types.getOrMakeTypeNode(rawNode.expression)
		let objName = expTypeNode ? Helper.types.getTypeNodeReferenceName(expTypeNode) : undefined
		let propName = Helper.access.getPropertyText(rawNode)

		if (objName === 'Map') {
			return propName === 'set' || propName === 'clear'
		}
		else if (objName === 'Set') {
			return propName === 'add' || propName === 'clear'
		}
		else if (Helper.types.isArrayType(expType)) {
			let methodDecl = Helper.symbol.resolveDeclaration(rawNode, Helper.isMethodLike)

			return !!methodDecl && (
				propName === 'push'
				|| propName === 'unshift'
				|| propName === 'sort'
				|| propName === 'splice'
			)
		}
		else {
			return false
		}
	}
}