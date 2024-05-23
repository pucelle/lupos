import type * as ts from 'typescript'
import {TSHelper} from '../../base/ts-helper'
import {ObservableContext} from './context'


/** Types than can be observed. */
export type CanObserveNode = ts.PropertyAccessExpression | ts.ElementAccessExpression
	| ts.Identifier | ts.ThisExpression
	| ts.CallExpression

/** Property accessing types. */
export type PropertyAccessingNode = ts.PropertyAccessExpression | ts.ElementAccessExpression

/** 
 * Nodes than will initialize a context.
 * Both method and function contain a block, include them because of wanting to examine parameters.
 */
export type ContextualNode = ts.SourceFile | ts.MethodDeclaration | ts.FunctionDeclaration | ts.FunctionExpression
	| ts.GetAccessorDeclaration| ts.SetAccessorDeclaration | ts.ArrowFunction | ts.ModuleDeclaration | ts.Block


/** Help to check observed state. */
export namespace ObservedChecker {

	/** Whether node represents a context. */
	export function isContextualNode(node: ts.Node, helper: TSHelper): node is ContextualNode {
		return helper.ts.isSourceFile(node)
			|| helper.ts.isMethodDeclaration(node)
			|| helper.ts.isFunctionDeclaration(node)
			|| helper.ts.isFunctionExpression(node)
			|| helper.ts.isGetAccessorDeclaration(node)
			|| helper.ts.isSetAccessorDeclaration(node)
			|| helper.ts.isArrowFunction(node)
			|| helper.ts.isModuleDeclaration(node)
			|| helper.ts.isBlock(node)
	}


	/** Whether type node is an observed type. */
	export function isTypeNodeObserved(node: ts.TypeNode, helper: TSHelper): boolean {

		// `Observed<>`, must use it directly, type extending is now working.
		if (helper.isNodeImportedFrom(node, 'Observed', '@pucelle/ff')) {
			return true
		}

		// `Component` like.
		else {
			let clsDecl = helper.resolveOneDeclaration(node, helper.ts.isClassDeclaration)
			if (clsDecl && helper.isClassImplemented(clsDecl, 'Observed', '@pucelle/ff')) {
				return true 
			}
		}

		return false
	}


	/** Returns whether be an identifier, this, or a property accessing. */
	export function canObserve(node: ts.Node, helper: TSHelper): node is CanObserveNode	{
		return helper.ts.isPropertyAccessExpression(node)
			|| helper.ts.isElementAccessExpression(node)
			|| node.kind === helper.ts.SyntaxKind.ThisKeyword
			|| helper.ts.isIdentifier(node)
			|| helper.ts.isCallExpression(node)
	}


	/** Whether type node is an observed type. */
	export function isVariableDeclarationObserved(node: ts.VariableDeclaration, context: ObservableContext): boolean {
		let helper = context.helper

		// `var a = {b:1} as Observed<{b: number}>`, observed.
		// `var a: Observed<{b: number}> = {b:1}`, observed.
		// Note here: `Observed` must appear directly, reference or alias is not working.

		let type = node.type 
		if (!type && node.initializer && helper.ts.isAsExpression(node.initializer)) {
			type = node.initializer.type
		}

		if (type && isImportedObservedTypeNode(type, helper)) {
			return true
		}

		// `var a = b.c`.
		if (node.initializer && canObserve(node.initializer, helper)) {
			return context.isAnyObserved(node.initializer)
		}

		return false
	}


	/** Test whether a type is `Observed`. */
	function isImportedObservedTypeNode(node: ts.TypeNode, helper: TSHelper): boolean {
		return helper.isNodeImportedFrom(node, 'Observed', '@pucelle/ff')
	}


	/** Check whether a property or get accessor declaration, or a property declaration is observed. */
	function checkPropertyOrGetAccessorObserved(node: PropertyAccessingNode, helper: TSHelper): boolean {

		// `class A{p: Observed}` -> `this.p` and `this['p']` is observed.
		// `interface A{p: Observed}` -> `this.p` and `this['p']` is observed.
		let nameDecl = helper.resolvePropertyOrGetAccessor(node)
		if (!nameDecl) {
			return false
		}

		let type = nameDecl.type

		// `class A{p = {} as Observed}`
		if (!type
			&& helper.ts.isPropertyDeclaration(nameDecl)
			&& nameDecl.initializer 
			&& helper.ts.isAsExpression(nameDecl.initializer)
		) {
			type = nameDecl.initializer.type
		}

		if (type) {
			return isImportedObservedTypeNode(type, helper)
		}

		return false
	}


	/** Returns whether a property accessing is observed. */
	export function isAccessingObserved(node: PropertyAccessingNode, context: ObservableContext): boolean {
		let helper = context.helper

		// Property declaration is as observed.
		if (checkPropertyOrGetAccessorObserved(node, helper)) {
			return true
		}

		// Method declaration is always not observed.
		if (helper.resolveMethod(node)) {
			return false
		}

		// Take `node = a.b.c` as example, exp is `a.b`.
		let exp = node.expression
		let expObserved = false

		// `a.b` or `a['b']`, and `c` is not a readonly property.
		if (helper.ts.isPropertyAccessExpression(exp) || helper.ts.isElementAccessExpression(exp)) {
			expObserved = isAccessingObserved(exp, context)
		}

		// `a.b()`.
		else if (helper.ts.isCallExpression(exp)) {
			return ObservedChecker.isCallObserved(exp, helper)
		}

		// `(a as Observed<{b: number}>).b`
		else if (helper.ts.isParenthesizedExpression(exp)) {
			expObserved = isParenthesizedObserved(exp, context)
		}

		// For `a.b`, `exp` is `a`.
		else if (helper.ts.isIdentifier(exp) || exp.kind === helper.ts.SyntaxKind.ThisKeyword) {
			expObserved = context.isIdentifierObserved(exp as ts.Identifier | ts.ThisExpression)
		}

		// Readonly properties are always not observed.
		if (expObserved) {
			let readonly = helper.isPropertyReadonly(node)
			if (readonly) {
				return false
			}
		}

		return expObserved
	}


	/** Returns whether a parenthesized expression is observed. */
	function isParenthesizedObserved(node: ts.ParenthesizedExpression, context: ObservableContext): boolean {
		let helper = context.helper
		let exp = node.expression

		// `((a as Observed<{b: number}>)).b`
		if (helper.ts.isParenthesizedExpression(exp)) {
			return isParenthesizedObserved(exp, context)
		}

		// `(a as Observed<{b: number}>).b`
		else if (helper.ts.isAsExpression(exp)) {
			let type = exp.type
			return type && helper.isNodeImportedFrom(type, 'Observed', '@pucelle/ff')
		}

		// `(a).b`
		else if (canObserve(exp, helper)) {
			return context.isAnyObserved(exp)
		}
		else {
			return false
		}
	}

	
	/** Returns whether a call expression returned result is observed. */
	export function isCallObserved(node: ts.CallExpression, helper: TSHelper): boolean {
		let decl = helper.resolveCallDeclaration(node)
		if (!decl) {
			return false
		}

		// Directly return an observed object, which implemented `Observed<>`.
		let returnType = helper.getReturnType(decl)
		if (returnType) {
			let symbol = returnType.getSymbol()
			if (symbol) {
				let clsDecl = helper.resolveOneSymbolDeclaration(symbol, helper.ts.isClassDeclaration)
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

		return isImportedObservedTypeNode(returnTypeNode, helper)
	}
}