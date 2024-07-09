import type TS from 'typescript'
import {PropertyAccessingNode} from '../../base/helper'
import {ts, helper} from '../../base'
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
export type CanObserveNode = PropertyAccessingNode
	| TS.Identifier | TS.ThisExpression
	| TS.CallExpression | TS.ParenthesizedExpression
	| TS.BinaryExpression | TS.ConditionalExpression

	
/** Help to check observed state. */
export namespace ObservedChecker {
	
	/** Check at which context the variable declared, or this attached. */
	export function getIdentifierDeclaredContext(node: TS.Identifier | TS.ThisExpression, context = ContextTree.current!): Context | null {
		if (node.kind === ts.SyntaxKind.ThisKeyword) {
			if (ts.isMethodDeclaration(context.node)
				|| ts.isFunctionDeclaration(context.node)
				|| ts.isFunctionExpression(context.node)
				|| ts.isSetAccessorDeclaration(context.node)
				|| ts.isGetAccessorDeclaration(context.node)
			) {
				return context
			}
			else if (context.parent) {
				return getIdentifierDeclaredContext(node, context.parent)
			}
			else {
				return null
			}
		}
		else {
			let name = node.text
			if (context.variables.hasLocalVariable(name)) {
				return context
			}
			else if (context.parent) {
				return getIdentifierDeclaredContext(node, context.parent!)
			}
			else {
				return null
			}
		}
	}


	/** Broadcast observed from parent calling expression to all parameters. */
	export function isParameterObservedByCallingBroadcasted(node: TS.ParameterDeclaration): boolean {

		// `a.b.map((item) => {return item.value})`
		// `a.b.map(item => item.value)`
		// `a.b.map(function(item){return item.value})`
		
		let fn = node.parent
		if (!(ts.isFunctionDeclaration(fn)
			|| ts.isFunctionExpression(fn)
			|| ts.isArrowFunction(fn)
		)) {
			return false
		}

		let calling = fn.parent
		if (!ts.isCallExpression(calling)) {
			return false
		}

		let exp = calling.expression
		if (!helper.isPropertyAccessing(exp)) {
			return false
		}

		// `a.b`
		let callFrom = exp.expression
		return isObserved(callFrom)
	}


	/** Whether type node is an observed type. */
	export function isTypeNodeObserved(node: TS.TypeNode): boolean {

		// `Observed<>`, must use it directly, type extending is now working.
		if (helper.isNodeImportedFrom(node, 'Observed', '@pucelle/ff')) {
			return true
		}

		// `Component` like.
		else {
			let clsDecl = helper.resolveOneDeclaration(node, ts.isClassDeclaration)
			if (clsDecl && helper.isClassImplemented(clsDecl, 'Observed', '@pucelle/ff')) {
				return true 
			}
		}

		return false
	}


	/** Whether type node is an observed type. */
	export function isVariableDeclarationObserved(node: TS.VariableDeclaration): boolean {

		// `var a = {b:1} as Observed<{b: number}>`, observed.
		// `var a: Observed<{b: number}> = {b:1}`, observed.
		// Note here: `Observed` must appear directly, reference or alias is not working.

		let type = node.type 
		if (!type && node.initializer && ts.isAsExpression(node.initializer)) {
			type = node.initializer.type
		}

		if (type && isImportedObservedTypeNode(type)) {
			return true
		}

		// `var a = b.c`.
		if (node.initializer) {
			return isObserved(node.initializer)
		}

		return false
	}


	/** Test whether a type node is `Observed`, and import from `ff`. */
	function isImportedObservedTypeNode(node: TS.TypeNode): boolean {
		return helper.isNodeImportedFrom(node, 'Observed', '@pucelle/ff')
	}


	/** Returns whether an identifier, this, or a property accessing is observed. */
	export function isObserved(node: TS.Node): node is CanObserveNode {

		// `a.b`
		// `(a ? b : c).d`
		// `(a ?? b).b`
		if (helper.isPropertyAccessing(node)) {
			return isAccessingObserved(node)
		}

		// `this`
		// `a`
		else if (node.kind === ts.SyntaxKind.ThisKeyword
			|| ts.isIdentifier(node)

			// variable `b`, bot not property part of `a.b`.
			&& (!helper.isPropertyAccessing(node.parent)
				|| helper.getPropertyAccessingName(node.parent) !== node
			)
		) {
			return isIdentifierObserved(node as TS.Identifier | TS.ThisExpression)
		}

		// `a && b`, `a || b`, `a ?? b`, can observe only if both a & b can observe.
		else if (ts.isBinaryExpression(node)) {
			return (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
				|| node.operatorToken.kind === ts.SyntaxKind.BarBarToken
				|| node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken)
				&& isObserved(node.left)
				&& isObserved(node.right)
		}

		// `(...)`
		else if (ts.isParenthesizedExpression(node)) {
			return isObserved(node.expression)
		}

		// `(a as Observed<{b: number}>).b`
		else if (ts.isAsExpression(node)) {
			let type = node.type
			return type && helper.isNodeImportedFrom(type, 'Observed', '@pucelle/ff')
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
	export function isAccessingObserved(node: PropertyAccessingNode): boolean {

		// Will never observe private identifier like `a.#b`.
		if (ts.isPropertyAccessExpression(node) && ts.isPrivateIdentifier(node.name)) {
			return false
		}

		// Property declaration has specified observed type.
		if (checkPropertyOrGetAccessorObserved(node)) {
			return true
		}

		// Method declaration is always not observed.
		if (helper.resolveMethod(node)) {
			return isMapOrSetReading(node)
		}

		// Take `node = a.b.c` as example, exp is `a.b`.
		let exp = node.expression
		let expObserved = isObserved(exp)

		// Readonly properties are always not been observed.
		if (expObserved) {
			let readonly = helper.isPropertyReadonly(node)
			if (readonly) {
				return false
			}
		}

		return expObserved
	}


	/** 
	 * Whether be a complex expression, and should be reference.
	 * `a().b` -> `var _ref_; ...; _ref_ = a(); _ref_.b`
	 * or `a[i++]` -> `var _ref; ... ; _ref_ = i++; a[_ref]`
	 */
	export function shouldReference(node: TS.Expression): boolean {

		// `a && b`, `a || b`, `a ?? b`.
		if (ts.isBinaryExpression(node)) {
			return true
		}

		// `a++`, `++a`.
		if (ts.isPostfixUnaryExpression(node) || ts.isPrefixUnaryExpression(node)) {
			return true
		}

		// `(...)`
		else if (ts.isParenthesizedExpression(node)) {
			return shouldReference(node.expression)
		}

		// `(a as Observed<{b: number}>).b`
		else if (ts.isAsExpression(node)) {
			return shouldReference(node.expression)
		}

		// `a ? b : c`
		else if (ts.isConditionalExpression(node)) {
			return true
		}

		// `a.b()`
		else if (ts.isCallExpression(node)) {
			return true
		}

		else {
			return false
		}
	}


	/** Check whether a property or get accessor declaration, or a property declaration is observed. */
	function checkPropertyOrGetAccessorObserved(node: PropertyAccessingNode): boolean {

		// `class A{p: Observed}` -> `this.p` and `this['p']` is observed.
		// `interface A{p: Observed}` -> `this.p` and `this['p']` is observed.
		let nameDecl = helper.resolvePropertyOrGetAccessor(node)
		if (!nameDecl) {
			return false
		}

		let type = nameDecl.type

		// `class A{p = {} as Observed}`
		if (!type
			&& ts.isPropertyDeclaration(nameDecl)
			&& nameDecl.initializer 
			&& ts.isAsExpression(nameDecl.initializer)
		) {
			type = nameDecl.initializer.type
		}

		if (type) {
			return isImportedObservedTypeNode(type)
		}

		return false
	}


	/** Test whether calls `Map.has`, `Map.get` or `Set.has` */
	export function isMapOrSetReading(node: PropertyAccessingNode) {
		let objName = helper.getNodeTypeName(node.expression)
		let propName = helper.getPropertyAccessingNameText(node)

		if (objName === 'Map') {
			return propName === 'has' || propName === 'get'
		}
		else if (objName === 'Set') {
			return propName === 'has'
		}
		else {
			return false
		}
	}


	/** Test whether calls `Map.set`, or `Set.set` */
	// export function isMapOrSetWriting(node: PropertyAccessingNode) {
	// 	let objName = helper.getNodeTypeName(node.expression)
	// 	let propName = helper.getPropertyAccessingName(node)

	// 	if (objName === 'Map') {
	// 		return propName === 'set'
	// 	}
	// 	else if (objName === 'Set') {
	// 		return propName === 'set'
	// 	}
	// 	else {
	// 		return false
	// 	}
	// }

	
	/** Returns whether a call expression returned result is observed. */
	export function isCallObserved(node: TS.CallExpression): boolean {
		let decl = helper.resolveCallDeclaration(node)
		if (!decl) {
			return false
		}

		// Directly return an observed object, which implemented `Observed<>`.
		let returnType = helper.getNodeReturnType(decl)
		if (returnType) {
			let symbol = returnType.getSymbol()
			if (symbol) {
				let clsDecl = helper.resolveOneSymbolDeclaration(symbol, ts.isClassDeclaration)
				if (clsDecl && helper.isClassImplemented(clsDecl, 'Observed', '@pucelle/ff')) {
					return true
				}
			}
		}

		// Declare the returned type as `Observed<>`.
		let returnTypeNode = decl.type
		if (!returnTypeNode) {
			return false
		}

		return isImportedObservedTypeNode(returnTypeNode)
	}
}