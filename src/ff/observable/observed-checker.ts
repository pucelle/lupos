import type TS from 'typescript'
import {AccessNode} from '../../base/helper'
import {ts, Helper, typeChecker} from '../../base'
import {ContextTree} from './context-tree'
import {Context} from './context'


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

	
/** Help to check observed state. */
export namespace ObservedChecker {

	/** Whether should observe node by it's type node. */
	export function isTypeNodeObserved(node: TS.TypeNode): boolean {

		// `Observed<>`, must use it directly, type extending is now working.
		if (Helper.symbol.isImportedFrom(node, 'Observed', '@pucelle/ff')) {
			return true
		}

		// `Component` like.
		else {
			let clsDecl = Helper.symbol.resolveDeclaration(node, ts.isClassDeclaration)
			if (clsDecl && Helper.cls.isImplemented(clsDecl, 'Observed', '@pucelle/ff')) {
				return true 
			}
		}

		return false
	}


	/** Whether variable declaration is observed. */
	export function isVariableDeclarationObserved(node: TS.VariableDeclaration): boolean {

		// `var a = {b:1} as Observed<{b: number}>`, observed.
		// `var a: Observed<{b: number}> = {b:1}`, observed.
		// Note here: `Observed` must appear directly, reference or alias is not working.

		let typeNode = node.type 
		let observed = false

		if (typeNode) {
			observed = isTypeNodeObserved(typeNode)
		}

		// `var a = b.c`.
		if (!observed && node.initializer) {
			observed = isObserved(node.initializer)
		}

		return observed
	}


	/** Whether parameter declaration is observed. */
	export function isParameterObserved(node: TS.ParameterDeclaration, context: Context = ContextTree.current!): boolean {
		let typeNode = node.type
		if (typeNode && isTypeNodeObserved(typeNode)) {
			return true
		}

		if (isParameterObservedByCallingBroadcasted(node, context)) {
			return true
		}

		if (node.initializer && isObserved(node.initializer, context)) {
			return true
		}

		return false
	}

	
	/** Broadcast observed from parent calling expression to all parameters. */
	function isParameterObservedByCallingBroadcasted(node: TS.ParameterDeclaration, context: Context = ContextTree.current!): boolean {

		// `a.b.map((item) => {return item.value})`
		// `a.b.map(item => item.value)`
		// `a.b.map(function(item){return item.value})`
		
		let fn = node.parent
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

		let exp = calling.expression
		if (!Helper.access.isAccess(exp)) {
			return false
		}

		// `a.b`
		let callFrom = exp.expression

		// Must use parent context.
		return isObserved(callFrom, context.parent!)
	}


	/** Returns whether an identifier, this, or a property accessing is observed. */
	export function isObserved(node: TS.Node, context: Context = ContextTree.current!): node is CanObserveNode {

		// `a.b`
		// `(a ? b : c).d`
		// `(a ?? b).b`
		if (Helper.access.isAccess(node)) {
			return isAccessingObserved(node, context)
		}

		// `this`
		// `a`
		else if (node.kind === ts.SyntaxKind.ThisKeyword
			|| ts.isIdentifier(node)

			// variable `b`, bot not property part of `a.b`.
			&& (!Helper.access.isAccess(node.parent)
				|| Helper.access.getNameNode(node.parent) !== node
			)
		) {
			return isIdentifierObserved(node as TS.Identifier | TS.ThisExpression, context)
		}

		// `a && b`, `a || b`, `a ?? b`, can observe only if both a & b can observe.
		else if (ts.isBinaryExpression(node)) {
			return (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
					|| node.operatorToken.kind === ts.SyntaxKind.BarBarToken
					|| node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
				)
				&& isObserved(node.left)
				&& isObserved(node.right)
		}

		// `(...)`
		else if (ts.isParenthesizedExpression(node)) {
			return isObserved(node.expression)
		}

		// `(a as Observed<{b: number}>).b`
		else if (ts.isAsExpression(node)) {
			let typeNode = node.type
			return typeNode && Helper.symbol.isImportedFrom(typeNode, 'Observed', '@pucelle/ff')
		}

		// `a ? b : c`, can observe only if both b & c can observe.
		else if (ts.isConditionalExpression(node)) {
			return isObserved(node.whenTrue)
				&& isObserved(node.whenFalse)
		}

		// `a.b()`
		else if (ts.isCallExpression(node)) {
			return isCallObserved(node)
		}

		else {
			return false
		}
	}


	/** 
	 * Check whether an identifier or `this` is observed.
	 * Node must be the top most property access expression.
	 * E.g., for `a.b.c`, sub identifier `b` or `c` is not allowed.
	 */
	export function isIdentifierObserved(node: TS.Identifier | TS.ThisExpression, context = ContextTree.current!): boolean {
		if (node.kind === ts.SyntaxKind.ThisKeyword) {
			return context.variables.thisObserved
		}

		let name = node.text
		return context.variables.isVariableObserved(name)
	}


	/** Returns whether a property accessing is observed. */
	export function isAccessingObserved(node: AccessNode, context: Context = ContextTree.current!): boolean {

		// Will never observe private identifier like `a.#b`.
		if (ts.isPropertyAccessExpression(node) && ts.isPrivateIdentifier(node.name)) {
			return false
		}

		// Property declaration has specified as observed type or observed initializer.
		if (checkPropertyOrGetAccessorObserved(node)) {
			return true
		}

		// Readonly properties are always not been observed.
		let readonly = Helper.types.isReadonly(node)
		if (readonly) {
			return false
		}

		// Take `node = a.b.c` as example, exp is `a.b`.
		let exp = node.expression
		let type = typeChecker.getTypeAtLocation(exp)

		// Visiting like string index will not get observed.
		if (Helper.types.isValueType(type)) {
			return false
		}

		// Method declarations will always not been observed, except few,
		// like map or set, which will be processed by outer logic.
		if (Helper.symbol.resolveMethod(node)
			&& !Helper.types.isArrayType(type)
		) {
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

		return isObserved(exp, context)
	}


	/** Check whether a property or get accessor declaration, or a property declaration is observed. */
	function checkPropertyOrGetAccessorObserved(node: AccessNode): boolean {

		// `class A{p: Observed}` -> `this.p` and `this['p']` is observed.
		// `interface A{p: Observed}` -> `this.p` and `this['p']` is observed.
		let nameDecl = Helper.symbol.resolvePropertyOrGetAccessor(node)
		if (!nameDecl) {
			return false
		}

		let typeNode = nameDecl.type

		// `class A{p: Observed<...>}`
		if (typeNode && isTypeNodeObserved(typeNode)) {
			return true
		}

		// `class A{p = {} as Observed}`, must not specified property type.
		if (!typeNode
			&& ts.isPropertyDeclaration(nameDecl)
			&& nameDecl.initializer
			&& isObserved(nameDecl.initializer)
		) {
			return true
		}

		return false
	}

	
	/** Returns whether a call expression returned result is observed. */
	export function isCallObserved(node: TS.CallExpression): boolean {
		let decl = Helper.symbol.resolveCallDeclaration(node)
		if (!decl) {
			return false
		}

		// Directly return an observed object, which implemented `Observed<>`.
		let returnType = Helper.types.getReturnType(decl)
		if (returnType) {
			let clsDecl = Helper.symbol.resolveDeclarationByType(returnType, ts.isClassDeclaration)
			if (clsDecl && Helper.cls.isImplemented(clsDecl, 'Observed', '@pucelle/ff')) {
				return true
			}
		}

		// Declare the returned type as `Observed<>`.
		let returnTypeNode = decl.type
		if (!returnTypeNode) {
			return false
		}

		return isTypeNodeObserved(returnTypeNode)
	}
}