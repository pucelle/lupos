import type TS from 'typescript'
import {AccessNode} from '../../base/helper'
import {ts, Helper, typeChecker} from '../../base'
import {ContextTree} from './context-tree'


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

		// Resolve type reference.
		if (ts.isTypeReferenceNode(typeNode)) {
			resolveFrom = typeNode.typeName
		}

		let decl = Helper.symbol.resolveDeclaration(resolveFrom)
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

		let typeNode = rawNode.type ?? Helper.types.getTypeNode(rawNode)
		let observed = false

		if (typeNode) {
			observed = isTypeNodeObserved(typeNode)
		}

		// `var a = b.c`.
		if (!observed && rawNode.initializer) {
			observed = isObserved(rawNode.initializer)
		}

		return observed
	}


	/** Whether destructed variable declaration should be observed. */
	export function isDestructedVariableDeclarationObserved(rawNode: TS.Node, initializerObserved: boolean): boolean {

		// Readonly properties are always not been observed.
		let readonly = Helper.types.isReadonly(rawNode)
		if (readonly) {
			return false
		}

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

		let typeNode = propDecl.type
		if (!typeNode
			&& ts.isGetAccessorDeclaration(propDecl)
		) {
			let returnType = Helper.types.getReturnType(propDecl)
			if (returnType) {
				typeNode = Helper.types.typeToTypeNode(returnType)
			}
		}

		// `class A{p: Observed<...>}`
		if (typeNode && isTypeNodeObserved(typeNode)) {
			return true
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

		// Now enters parent context.
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
		if (!Helper.access.isListStruct(callFrom)) {
			return false
		}

		// Must use parent context.
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
		else if (rawNode.kind === ts.SyntaxKind.ThisKeyword
			|| Helper.variable.isVariableIdentifier(rawNode)
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

		// Will never observe private identifier like `a.#b`.
		if (ts.isPropertyAccessExpression(rawNode) && ts.isPrivateIdentifier(rawNode.name)) {
			return false
		}

		// `[]`, `Map`, `Set`.
		if (Helper.access.isListStruct(rawNode.expression)) {
			return isObserved(rawNode.expression, true)
		}

		// Only check when directly visiting the node.
		if (!parental) {

			// Always ignore get and set accessor, except `@computed` decorated.
			let decl = Helper.symbol.resolveDeclaration(rawNode, ts.isAccessor)
			if (decl) {
				let decoName = Helper.deco.getFirstName(decl)
				if (decoName !== 'computed') {
					return false
				}
			}

			// Readonly properties are always not been observed.
			let readonly = Helper.types.isReadonly(rawNode)
			if (readonly) {
				return false
			}
		}

		// Property declaration has specified as observed type or observed initializer.
		if (isPropertyDeclaredAsObserved(rawNode)) {
			return true
		}

		// Typescript lib.
		if (Helper.symbol.isOfTypescriptLib(rawNode)) {
			return false
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
		let context = ContextTree.findClosestByNode(rawNode)

		if (rawNode.kind === ts.SyntaxKind.ThisKeyword) {
			return context.variables.thisObserved
		}

		let name = rawNode.text
		return context.variables.isVariableObserved(name)
	}

	
	/** Returns whether a call expression returned result should be observed. */
	function isCallObserved(rawNode: TS.CallExpression): boolean {
		let decl = Helper.symbol.resolveDeclaration(rawNode.expression, Helper.isFunctionLike)
		if (!decl) {
			return false
		}

		// Test whether returned type should be observed.
		let returnTypeNode = decl.type
		if (!returnTypeNode) {
			let returnType = Helper.types.getReturnType(decl)
			if (returnType) {
				returnTypeNode = Helper.types.typeToTypeNode(returnType)
			}
		}

		if (!returnTypeNode) {
			return false
		}

		return isTypeNodeObserved(returnTypeNode)
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
		let expType = Helper.types.getType(rawNode.expression)
		let expTypeNode = Helper.types.getTypeNode(rawNode.expression)
		let objName = expTypeNode ? Helper.types.getTypeNodeReferenceName(expTypeNode) : undefined
		let propName = Helper.access.getNameText(rawNode)

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
		let expType = Helper.types.getType(rawNode.expression)
		let expTypeNode = Helper.types.getTypeNode(rawNode.expression)
		let objName = expTypeNode ? Helper.types.getTypeNodeReferenceName(expTypeNode) : undefined
		let propName = Helper.access.getNameText(rawNode)

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