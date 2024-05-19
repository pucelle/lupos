import type * as ts from 'typescript'
import {TSHelper} from '../../base/ts-helper'
import {ObservedContext} from './context'


/** Types than can be observed. */
export type CanObserveType = ts.PropertyAccessExpression | ts.ElementAccessExpression | ts.Identifier | ts.ThisExpression

/** Property accessing types. */
export type PropertyAccessingType = ts.PropertyAccessExpression | ts.ElementAccessExpression


/** Help to check observed state. */
export class ObservedChecker {

	readonly helper: TSHelper
	readonly ts: typeof ts

	constructor(helper: TSHelper) {
		this.helper = helper
		this.ts = helper.ts
	}

	/** Whether type node is an observed type. */
	isTypeNodeObserved(node: ts.TypeNode): boolean {

		// `Observed<>`, must use it directly, type extending is now working.
		if (this.helper.isTypeImportedFrom(node, 'Observed', '@pucelle/ff')) {
			return true
		}

		// `Component` like.
		else {
			let clsDecl = this.helper.resolveOneDeclaration(node, this.ts.isClassDeclaration)
			if (clsDecl && this.helper.isClassImplemented(clsDecl, 'Observed', '@pucelle/ff')) {
				return true 
			}
		}

		return false
	}

	/** Returns whether be an identifier, this, or a property accessing. */
	canObserve(node: ts.Node): node is CanObserveType	{
		return this.ts.isPropertyAccessExpression(node)
			|| this.ts.isElementAccessExpression(node)
			|| node.kind === this.ts.SyntaxKind.ThisKeyword
			|| this.ts.isIdentifier(node)
	}

	/** Whether type node is an observed type. */
	isVariableDeclarationObserved(node: ts.VariableDeclaration, context: ObservedContext): boolean {

		// `var a = {b:1} as Observed<{b: number}>`, observed.
		// `var a: Observed<{b: number}> = {b:1}`, observed.
		// Note here: `Observed` must appear directly, reference or alias is not working.

		let type = node.type 
		if (!type && node.initializer && this.ts.isAsExpression(node.initializer)) {
			type = node.initializer.type
		}

		if (type && this.isObservedType(type)) {
			return true
		}

		// `var a = b.c`.
		if (node.initializer && this.canObserve(node.initializer)) {
			return context.isAnyObserved(node.initializer)
		}

		return false
	}

	/** Test whether a type is `Observed`. */
	private isObservedType(node: ts.TypeNode): boolean {
		return this.helper.isTypeImportedFrom(node, 'Observed', '@pucelle/ff')
	}

	/** 
	 * Analysis whether a property access expression is readonly.
	 * Node must be the top most property access expression.
	 */
	private checkPropertyReadonly(node: PropertyAccessingType): boolean {

		// `class A{readonly p}` -> `this.p` and `this['p']` are readonly.
		// `interface A{readonly p}` -> `this.p` and `this['p']` are readonly.
		let nameDecl = this.resolvePropertyDeclaration(node)

		if (nameDecl && nameDecl.modifiers?.find(m => m.kind === this.ts.SyntaxKind.ReadonlyKeyword)) {
			return true
		}

		// `b: Readonly<{p: 1}>` -> `b.p` is readonly, not observed.
		// `c: ReadonlyArray<...>` -> `c.?` is readonly, not observed.
		// `d: DeepReadonly<...>` -> `d.?` and `d.?.?` are readonly, not observed.
		let exp = node.expression

		if (this.helper.isNodeReadonlyType(exp)) {
			return true
		}

		return false
	}

	/** Resolve property declaration. */
	private resolvePropertyDeclaration(node: PropertyAccessingType): ts.PropertySignature | ts.PropertyDeclaration | undefined {
		let name = this.ts.isPropertyAccessExpression(node) ? node.name : node.argumentExpression

		let testFn = ((node: ts.Node) => this.ts.isPropertySignature(node) || this.ts.isPropertyDeclaration(node)) as
			((node: ts.Node) => node is ts.PropertySignature | ts.PropertyDeclaration)

		return this.helper.resolveOneDeclaration(name, testFn)
	}

	/** Resolve method declaration. */
	private resolveMethodDeclaration(node: PropertyAccessingType): ts.MethodSignature | ts.MethodDeclaration | undefined {
		let name = this.ts.isPropertyAccessExpression(node) ? node.name : node.argumentExpression

		let testFn = ((node: ts.Node) => this.ts.isMethodSignature(node) || this.ts.isMethodDeclaration(node)) as
			((node: ts.Node) => node is ts.MethodSignature | ts.MethodDeclaration)

		return this.helper.resolveOneDeclaration(name, testFn)
	}

	/** Analysis whether a property declaration is observed. */
	private checkPropertyDeclarationObserved(node: PropertyAccessingType): boolean {

		// `class A{p: Observed}` -> `this.p` and `this['p']` is observed.
		// `interface A{p: Observed}` -> `this.p` and `this['p']` is observed.
		let nameDecl = this.resolvePropertyDeclaration(node)
		if (!nameDecl) {
			return false
		}

		let type = nameDecl.type

		// `class A{p = {} as Observed}`
		if (!type
			&& this.ts.isPropertyDeclaration(nameDecl)
			&& nameDecl.initializer 
			&& this.ts.isAsExpression(nameDecl.initializer)
		) {
			type = nameDecl.initializer.type
		}

		if (type) {
			return this.isObservedType(type)
		}

		return false
	}

	/** Returns whether a property accessing is observed. */
	isAccessingObserved(node: PropertyAccessingType, context: ObservedContext): boolean {

		// Property declaration is as observed.
		if (this.checkPropertyDeclarationObserved(node)) {
			return true
		}

		// Method declaration is always not observed.
		if (this.resolveMethodDeclaration(node)) {
			return false
		}

		// Take `node = a.b.c` as example, exp is `a.b`.
		let exp = node.expression
		let expObserved = false

		// `a.b` or `a['b']`, and `c` is not a readonly property.
		if (this.ts.isPropertyAccessExpression(exp) || this.ts.isElementAccessExpression(exp)) {
			expObserved = this.isAccessingObserved(exp, context)
		}

		// `(a as Observed<{b: number}>).b`
		else if (this.ts.isParenthesizedExpression(exp)) {
			expObserved = this.isParenthesizedObserved(exp, context)
		}

		// For `a.b`, `exp` is `a`.
		else if (this.ts.isIdentifier(exp) || exp.kind === this.ts.SyntaxKind.ThisKeyword) {
			expObserved = context.isIdentifierObserved(exp as ts.Identifier | ts.ThisExpression)
		}

		// Readonly properties are always not observed.
		if (expObserved) {
			let readonly = this.checkPropertyReadonly(node)
			if (readonly) {
				return false
			}
		}

		return expObserved
	}

	/** Returns whether a parenthesized expression is observed. */
	private isParenthesizedObserved(node: ts.ParenthesizedExpression, context: ObservedContext): boolean {
		let exp = node.expression

		// `((a as Observed<{b: number}>)).b`
		if (this.ts.isParenthesizedExpression(exp)) {
			return this.isParenthesizedObserved(exp, context)
		}

		// `(a as Observed<{b: number}>).b`
		else if (this.ts.isAsExpression(exp)) {
			let type = exp.type
			return type && this.helper.isTypeImportedFrom(type, 'Observed', '@pucelle/ff')
		}

		// `(a).b`
		else if (this.canObserve(exp)) {
			return context.isAnyObserved(exp)
		}
		else {
			return false
		}
	}
}