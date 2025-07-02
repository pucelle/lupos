import * as ts from 'typescript'
import {AccessNode} from '../../lupos-ts-module'
import {typeChecker, helper} from '../../core'
import {GenericType} from 'typescript'
import {TrackingPatch} from './patch'
import {ObservedStateMask} from './types'


/** Help to check observed state. */
export namespace ObservedChecker {

	/** Test whether value of current access node is mutable, like `a.b`. */
	export function isSelfObserved(rawNode: ts.Node): rawNode is AccessNode {

		// Must be access node.
		if (!helper.access.isAccess(rawNode)) {
			return false
		}

		// Force track.
		if (TrackingPatch.isForceTrackedAs(rawNode, ObservedStateMask.Self)) {
			return true
		}

		// `a.b`
		// `(a ? b : c).d`
		// `(a ?? b).b`
		// Declared in Typescript lib, like `Date.getTime`
		if (helper.symbol.isOfTypescriptLib(rawNode)) {
			return false
		}

		// Will not observe properties for those starts with '$' like `a.$b`, `a.$b.c`.
		if (helper.access.getPropertyText(rawNode).startsWith('$')) {
			return false
		}


		// As readonly property, not mutable.
		let readonly = helper.types.isReadonly(rawNode)
		if (readonly) {
			return false
		}


		// Test declaration.
		let decl = helper.symbol.resolveDeclaration(rawNode)

		// Method declarations will always not mutable.
		if (decl && helper.isMethodLike(decl)) {
			return false
		}

		// Ignore get and set accessor, and class implements observed,
		// getter or setter should implements tracking itself, so stop.
		// But `@computed` decorated will always continue.
		if (decl && ts.isAccessor(decl)) {
			let decoNameBeComputed = helper.deco.getFirstName(decl) === 'computed'
			let isClassDeclObserved = isDeclarationObserved(helper.symbol.resolveDeclaration(decl.parent))

			if (isClassDeclObserved && !decoNameBeComputed) {
				return false
			}
		}
		
		
		// Take `node = string[0]` as example, exp is `string`.
		let exp = rawNode.expression
		let expType = typeChecker.getTypeAtLocation(exp)

		// Visiting like string index will not get observed.
		if (helper.types.isValueType(expType)) {
			return false
		}


		// Normally if parent expression is observed, child is mutable.
		return isElementsObserved(rawNode.expression)
	}


	/** 
	 * Returns whether an expression should be observed, which means should track
	 * the getting and setting of their sub properties.
	 * 
	 * Input expression can be:
	 * - an identifier
	 * - this
	 * - a property accessing
	 * - a new expression
	 * - a call expression
	 * - a binary expression
	 * - a conditional expression
	 * - an as expression
	 */
	export function isElementsObserved(rawNode: ts.Expression): boolean {

		// Force track.
		if (TrackingPatch.isForceTrackedAs(rawNode, ObservedStateMask.Elements)) {
			return true
		}

		// `a.b`
		// `(a ? b : c).d`
		// `(a ?? b).b`
		if (helper.access.isAccess(rawNode)) {
			return isAccessObserved(rawNode)
		}

		// `this`
		else if (helper.isThis(rawNode)) {
			return isThisObserved(rawNode)
		}
		
		// `a`
		else if (ts.isIdentifier(rawNode)) {
			return isIdentifierObserved(rawNode)
		}

		// `a && b`, `a || b`, `a ?? b`, can observe only if both a & b can observe.
		else if (ts.isBinaryExpression(rawNode)) {
			return (rawNode.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
					|| rawNode.operatorToken.kind === ts.SyntaxKind.BarBarToken
					|| rawNode.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
				)
				&& isElementsObserved(rawNode.left)
				&& isElementsObserved(rawNode.right)
		}

		// `(...)`
		else if (ts.isParenthesizedExpression(rawNode)) {
			return isElementsObserved(rawNode.expression)
		}

		// `...!`
		else if (ts.isNonNullExpression(rawNode)) {
			return isElementsObserved(rawNode.expression)
		}

		// `(a as Observed<{b: number}>).b`
		else if (ts.isAsExpression(rawNode)) {
			let typeNode = rawNode.type
			return typeNode && isTypeNodeObserved(typeNode)
		}

		// `a ? b : c`, can observe only if both b & c should be observed.
		else if (ts.isConditionalExpression(rawNode)) {
			return isElementsObserved(rawNode.whenTrue)
				&& isElementsObserved(rawNode.whenFalse)
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
			let decl = helper.symbol.resolveDeclaration(rawNode.expression)
			return isDeclarationObserved(decl)
		}

		else {
			return false
		}
	}


	/** Whether a type node represented node should be observed. */
	function isTypeNodeObserved(typeNode: ts.TypeNode | undefined): boolean {
		if (!typeNode) {
			return false
		}

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

		// A extends B ? C : D
		if (ts.isConditionalTypeNode(typeNode)) {
			return isTypeNodeObserved(typeNode.trueType)
				|| isTypeNodeObserved(typeNode.falseType)
		}

		// Observed<>
		if (helper.symbol.isImportedFrom(typeNode, 'Observed', '@pucelle/ff')) {
			return true
		}

		let resolveFrom: ts.Node = typeNode

		// Resolve type reference name.
		if (ts.isTypeReferenceNode(typeNode)) {
			resolveFrom = typeNode.typeName
		}

		let decl = helper.symbol.resolveDeclaration(resolveFrom)
		return isDeclarationObserved(decl)
	}

	/** 
	 * Whether a type should be observed.
	 * A newly made `TypeNode` can't resolve symbol and declaration,
	 * so need the type observed checker.
	 */
	function isTypeObserved(type: ts.Type): boolean {

		// `A | B`, `A & B`, become observed if any is observed.
		if (type.isUnionOrIntersection()) {
			return type.types.some(t => isTypeObserved(t))
		}

		// `A[]`, check for `A`.
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

		let decl = helper.symbol.resolveDeclarationBySymbol(symbol)
		if (!decl) {
			return false
		}

		return isDeclarationObserved(decl)
	}

	/** Whether resolved declaration should be observed. */
	function isDeclarationObserved(decl: ts.Declaration | undefined): boolean {
		if (!decl) {
			return false
		}
				
		// Force track.
		if (TrackingPatch.isForceTrackedAs(decl, ObservedStateMask.Elements)) {
			return true
		}

		// Properties
		// `class A{p: Observed}` -> `this.p` and `this['p']` is observed.
		// `interface A{p: Observed}` -> `this.p` and `this['p']` is observed.
		if (helper.isPropertyOrGetAccessor(decl)) {
			return isPropertyDeclarationObserved(decl)
		}

		// Test whether parameter declaration is observed.
		if (ts.isParameter(decl)) {
			return isParameterDeclarationObserved(decl)
		}

		// Test whether variable declaration is observed.
		if (ts.isVariableDeclaration(decl)) {
			return isVariableDeclarationObserved(decl)
		}

		// Test whether variable declaration is observed.
		if (ts.isBindingElement(decl)) {
			return isBindingElementObserved(decl)
		}

		// Test type parameter.
		if (ts.isTypeParameterDeclaration(decl)) {
			return isTypeNodeObserved(decl.constraint)
		}

		// Observed interface.
		if (ts.isInterfaceDeclaration(decl)
			&& helper.objectLike.isDerivedOf(decl, 'Observed', '@pucelle/ff')
		) {
			return true 
		}

		// Observed class.
		if (ts.isClassDeclaration(decl)
			&& helper.class.isImplementedOf(decl, 'Observed', '@pucelle/ff')
		) {
			return true 
		}

		return false
	}


	/** 
	 * Check whether a property or get accessor declaration should be observed.
	 * It ignores modifiers, only check declaration type.
	 */
	function isPropertyDeclarationObserved(decl: ts.PropertySignature | ts.PropertyDeclaration | ts.GetAccessorDeclaration): boolean {

		// `class A{p: Observed<...>}`
		let typeNode = decl.type
		if (isTypeNodeObserved(typeNode)) {
			return true
		}

		// Return type of declaration.
		if (ts.isGetAccessorDeclaration(decl)) {
			let returnType = helper.types.getReturnTypeOfSignature(decl)
			if (returnType && isTypeObserved(returnType)) {
				return true
			}
		}

		// `class A{p = {} as Observed}`, must not specified property type.
		if (!typeNode
			&& ts.isPropertyDeclaration(decl)
			&& decl.initializer
			&& isElementsObserved(decl.initializer)
		) {
			return true
		}

		return false
	}


	/** Whether parameter declaration should be observed. */
	function isParameterDeclarationObserved(rawNode: ts.ParameterDeclaration): boolean {
		let typeNode = rawNode.type
		if (typeNode && isTypeNodeObserved(typeNode)) {
			return true
		}

		// `var a = b`, if `b` is observed, `a` is too.
		if (rawNode.initializer && isElementsObserved(rawNode.initializer)) {
			return true
		}

		// `a.map((b) => ...`, if `a` is observed, `b` is too.
		if (isParameterObservedByCallBroadcasting(rawNode)) {
			return true
		}

		return false
	}

	/** Broadcast observed from parent calling expression to all parameters. */
	function isParameterObservedByCallBroadcasting(rawNode: ts.ParameterDeclaration): boolean {

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
		if (!helper.access.isAccess(exp)) {
			return false
		}

		// `a.b` of `a.b.map`.
		if (!helper.access.isOfElementsAccess(exp)) {
			return false
		}

		// Must use parent scope.
		return isElementsObserved(exp.expression)
	}


	/** Whether a variable declaration should be observed. */
	function isVariableDeclarationObserved(rawNode: ts.VariableDeclaration): boolean {
		// `var a = {b:1} as Observed<{b: number}>`, observed.
		// `var a: Observed<{b: number}> = {b:1}`, observed.
		// Note here: `Observed` must appear directly, reference or alias is not working.
		
		let typeNode = rawNode.type
		if (typeNode && isTypeNodeObserved(typeNode)) {
			return true
		}

		let type = helper.types.typeOf(rawNode)
		if (type && isTypeObserved(type)) {
			return true
		}

		// `var a = b.c`.
		if (rawNode.initializer && isElementsObserved(rawNode.initializer)) {
			return true
		}

		// `for (item of items)`, broadcast observed from items to item.
		if (rawNode.parent
			&& ts.isVariableDeclarationList(rawNode.parent)
			&& ts.isForOfStatement(rawNode.parent.parent)
		) {
			if (isElementsObserved(rawNode.parent.parent.expression)) {
				return true
			}
		}

		return false
	}

	/** Test whether a binding element, like a of `{a} = ...`, `[a] = ...` should be observed. */
	function isBindingElementObserved(rawNode: ts.BindingElement): boolean {
		let decl = helper.findOutward(rawNode, ts.isVariableDeclaration)
		return isDeclarationObserved(decl)
	}


	/** 
	 * Returns whether a property accessing should be observed, for internal use only.
	 * `visitElements` specifies whether are visiting parent node of original to determine observed.
	 */
	function isAccessObserved(rawNode: AccessNode): boolean {

		// Declared in Typescript lib, like `Date.getTime`
		if (helper.symbol.isOfTypescriptLib(rawNode)) {
			return false
		}

		// Will not observe sub properties for those starts with '$' like `a.$b`, `a.$b.c`.
		if (helper.access.getPropertyText(rawNode).startsWith('$')) {
			return false
		}

		// Readonly elements are not observed.
		let elementsReadonly = helper.types.isElementsReadonly(rawNode)
		if (elementsReadonly) {
			return false
		}


		// Test declaration.
		let decl = helper.symbol.resolveDeclaration(rawNode)

		// Property declaration has specified as observed type or initializer is observed.
		if (isDeclarationObserved(decl)) {
			return true
		}

		// Always not observe method, it works like a value type.
		if (decl && helper.isMethodLike(decl)) {
			return false
		}


		// Take type, e.g., for `node = a.b.c`, exp is `a.b`.
		let exp = rawNode.expression
		let expType = typeChecker.getTypeAtLocation(exp)

		// Visiting like string index will not get observed.
		if (helper.types.isValueType(expType)) {
			return false
		}


		return isElementsObserved(exp)
	}


	/** Test whether this is observed. */
	function isThisObserved(rawNode: ts.ThisExpression) {

		// May resolve to this parameter, class declaration name.
		let decl = helper.symbol.resolveDeclaration(rawNode)
		return isDeclarationObserved(decl)
	}


	/** Check whether an identifier should be observed. */
	function isIdentifierObserved(rawNode: ts.Identifier): boolean {

		// May resolve to variable declaration, parameter declaration.
		let decl = helper.symbol.resolveDeclaration(rawNode)
		return isDeclarationObserved(decl)
	}

	
	/** Returns whether a call expression returned result should be observed. */
	function isCallObserved(rawNode: ts.CallExpression): boolean {
		let callExp = rawNode.expression
		let decl = helper.symbol.resolveDeclaration(callExp, helper.isFunctionLike)
		if (!decl) {
			return false
		}

		// Test call method returned type node.
		let returnTypeNode = decl.type
		if (returnTypeNode && isTypeNodeObserved(returnTypeNode)) {
			return true
		}

		// Test call method returned type.
		let returnType = helper.types.getReturnTypeOfSignature(decl)
		if (returnType && isTypeObserved(returnType)) {
			return true
		}

		// `this.map.get` of `this.map.get(x)`.
		// Result is observed.
		if (helper.access.isAccess(callExp)
			&& helper.access.isOfSingleElementReadAccess(callExp)
		) {
			return isElementsObserved(callExp.expression)
		}

		// Here we plan to support more features like `Array.filter(...)`,
		// It's returned result is not observed, but it's elements is observed.
		// This breaks the normal observed state broadcasting mechanism,
		// so we have to separate observed state to several like:
		// `Itself-Observed` / `Itself-Not-Observed-But-Elements-Are`.
		// This brings two much complexity.

		return false
	}
}