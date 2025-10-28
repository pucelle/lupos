import * as ts from 'typescript'
import {AccessNode} from '../../lupos-ts-module'
import {typeChecker, helper} from '../../core'
import {GenericType} from 'typescript'
import {TrackingPatch} from './patch'
import {ObservedStateMask} from './types'


/** 
 * Help to check observed state.
 * Returned values:
 * 	   true: Be Observed
 *     false: Be unObserved
 *     null: continue checking
 */
export namespace ObservedChecker {

	/** Test whether value of current access node is mutable, like `a.b`. */
	export function getSelfObserved(rawNode: ts.Node): boolean | null {

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
			let declParentResolved = helper.symbol.resolveDeclaration(decl.parent)
			if (declParentResolved) {
				let isClassDeclObserved = getDeclarationObserved(declParentResolved)
				if (isClassDeclObserved && !decoNameBeComputed) {
					return false
				}
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
		return getElementsObserved(rawNode.expression)
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
	export function getElementsObserved(rawNode: ts.Expression): boolean | null {

		// Force track.
		if (TrackingPatch.isForceTrackedAs(rawNode, ObservedStateMask.Elements)) {
			return true
		}

		// `a.b`
		// `(a ? b : c).d`
		// `(a ?? b).b`
		if (helper.access.isAccess(rawNode)) {
			return getAccessObserved(rawNode)
		}

		// `this`
		else if (helper.isThis(rawNode)) {
			return getThisObserved(rawNode)
		}
		
		// `a`
		else if (ts.isIdentifier(rawNode)) {
			return getIdentifierObserved(rawNode)
		}

		// `a && b`, `a || b`, `a ?? b`, can observe only if both a & b can observe.
		else if (ts.isBinaryExpression(rawNode)) {
			if (rawNode.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
				|| rawNode.operatorToken.kind === ts.SyntaxKind.BarBarToken
				|| rawNode.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
			) {
				return getElementsObserved(rawNode.left)
					?? getElementsObserved(rawNode.right)
			}
			else {
				return null
			}
		}

		// `(...)`
		else if (ts.isParenthesizedExpression(rawNode)) {
			return getElementsObserved(rawNode.expression)
		}

		// `...!`
		else if (ts.isNonNullExpression(rawNode)) {
			return getElementsObserved(rawNode.expression)
		}

		// `(a as Observed<{b: number}>).b`
		else if (ts.isAsExpression(rawNode)) {
			let typeNode = rawNode.type
			if (!typeNode) {
				return null
			}

			// If `this.prop as Prop`, this is observed but prop not,
			// will still analyze for this.
			let result = getTypeNodeObserved(typeNode)
			if (result !== null) {
				return result
			}

			return getElementsObserved(rawNode.expression)
		}

		// `a ? b : c`, can observe only if both b & c should be observed.
		else if (ts.isConditionalExpression(rawNode)) {
			return getElementsObserved(rawNode.whenTrue)
				?? getElementsObserved(rawNode.whenFalse)
		}

		// `a.b()`
		else if (ts.isCallExpression(rawNode)) {
			return getCallObserved(rawNode)
		}

		// `new a()`
		else if (ts.isNewExpression(rawNode)
			&& (ts.isIdentifier(rawNode.expression)
				|| ts.isClassExpression(rawNode.expression)
			)
		) {
			let decl = helper.symbol.resolveDeclaration(rawNode.expression)
			if (!decl) {
				return null
			}

			return getDeclarationObserved(decl)
		}

		else {
			return null
		}
	}


	/** Whether a type node represented node should be observed. */
	function getTypeNodeObserved(typeNode: ts.TypeNode | undefined): boolean | null {
		let result: boolean | null

		if (!typeNode) {
			return null
		}

		// `A | B`
		if (ts.isUnionTypeNode(typeNode)
			|| ts.isIntersectionTypeNode(typeNode)
		) {
			for (let type of typeNode.types) {
				result = getTypeNodeObserved(type)
				if (result !== null) {
					return result
				}
			}

			return null
		}

		// `A[]`
		else if (ts.isArrayTypeNode(typeNode)) {
			return getTypeNodeObserved(typeNode.elementType)
		}

		// `A extends B ? C : D`
		else if (ts.isConditionalTypeNode(typeNode)) {
			return getTypeNodeObserved(typeNode.trueType)
				?? getTypeNodeObserved(typeNode.falseType)
		}

		// `Observed<>`
		else if (helper.symbol.isImportedFrom(typeNode, 'Observed', '@pucelle/lupos')) {
			return true
		}

		// `UnObserved<>`
		else if (helper.symbol.isImportedFrom(typeNode, 'UnObserved', '@pucelle/lupos')) {
			return false
		}

		// Resolve from type node.
		else {
			let resolveFrom: ts.Node = typeNode

			// Resolve type reference name.
			if (ts.isTypeReferenceNode(typeNode)) {
				resolveFrom = typeNode.typeName
			}

			let decl = helper.symbol.resolveDeclaration(resolveFrom)
			if (!decl) {
				return null
			}
			return getDeclarationObserved(decl)
		}
	}

	/** 
	 * Whether a type should be observed.
	 * A newly made `TypeNode` can't resolve symbol and declaration,
	 * so need the type observed checker.
	 */
	function getTypeObserved(type: ts.Type): boolean | null {
		let result: boolean | null

		// `A | B`, `A & B`, become observed if any is observed.
		if (type.isUnionOrIntersection()) {
			for (let t of type.types) {
				result = getTypeObserved(t)
				if (result !== null) {
					return result
				}
			}

			return null
		}

		// `A[]`, check for `A`.
		else if (typeChecker.isArrayType(type)) {
			let parameter = (type as GenericType).typeParameters?.[0]
			if (parameter) {
				return getTypeObserved(parameter)
			}
	
			return null
		}

		// Resolve type.
		else {
			let symbol = type.getSymbol()
			if (!symbol) {
				return null
			}

			let decl = helper.symbol.resolveDeclarationBySymbol(symbol)
			if (!decl) {
				return null
			}

			return getDeclarationObserved(decl)
		}
	}

	/** Whether resolved declaration should be observed. */
	function getDeclarationObserved(decl: ts.Declaration): boolean | null {
		if (!decl) {
			return null
		}
				
		// Force track.
		if (TrackingPatch.isForceTrackedAs(decl, ObservedStateMask.Elements)) {
			return true
		}

		// Properties
		// `class A{p: Observed}` -> `this.p` and `this['p']` is observed.
		// `interface A{p: Observed}` -> `this.p` and `this['p']` is observed.
		if (helper.isPropertyOrGetAccessor(decl)) {
			return getPropertyDeclarationObserved(decl)
		}

		// Test whether parameter declaration is observed.
		else if (ts.isParameter(decl)) {
			return getParameterDeclarationObserved(decl)
		}

		// Test whether variable declaration is observed.
		else if (ts.isVariableDeclaration(decl)) {
			return getVariableDeclarationObserved(decl)
		}

		// Test whether `[a]` or `{a}` is observed.
		// Get resolved from a variable identifier.
		else if (ts.isBindingElement(decl)) {
			return getBindingElementObserved(decl)
		}

		// Test type parameter.
		else if (ts.isTypeParameterDeclaration(decl)) {
			return getTypeNodeObserved(decl.constraint)
		}

		// Observed interface.
		else if (ts.isInterfaceDeclaration(decl)) {
			let firstDerived = helper.objectLike.getFirstDerivedOf(decl, ['Observed', 'UnObserved'], '@pucelle/lupos')
			if (firstDerived === 'Observed') {
				return true
			}
			else if (firstDerived === 'UnObserved') {
				return false
			}

			return null
		}

		// Observed class.
		else if (ts.isClassDeclaration(decl)) {
			let firstImplemented = helper.class.getFirstImplementedOf(decl, ['Observed', 'UnObserved'], '@pucelle/lupos')
			if (firstImplemented === 'Observed') {
				return true
			}
			else if (firstImplemented === 'UnObserved') {
				return false
			}

			return null
		}

		else {
			return null
		}
	}


	/** 
	 * Check whether a property or get accessor declaration should be observed.
	 * It ignores modifiers, only check declaration type.
	 */
	function getPropertyDeclarationObserved(decl: ts.PropertySignature | ts.PropertyDeclaration | ts.GetAccessorDeclaration): boolean | null {
		let result: boolean | null

		// `class A{p: Observed<...>}`
		let typeNode = decl.type
		result = getTypeNodeObserved(typeNode)
		if (result !== null) {
			return result
		}

		// Return type of declaration.
		if (ts.isGetAccessorDeclaration(decl)) {
			let returnType = helper.types.getReturnTypeOfSignature(decl)
			if (returnType) {
				result = getTypeObserved(returnType)
				if (result !== null) {
					return result
				}
			}
		}

		// `class A{p = {} as Observed}`, must not specified property type.
		if (!typeNode
			&& ts.isPropertyDeclaration(decl)
			&& decl.initializer
		) {
			result = getElementsObserved(decl.initializer)
			if (result !== null) {
				return result
			}
		}

		return null
	}


	/** Whether parameter declaration should be observed. */
	function getParameterDeclarationObserved(rawNode: ts.ParameterDeclaration): boolean | null {
		let result: boolean | null

		let typeNode = rawNode.type
		if (typeNode) {
			result = getTypeNodeObserved(typeNode)
			if (result !== null) {
				return result
			}
		}

		// `var a = b`, if `b` is observed, `a` is too.
		if (rawNode.initializer) {
			result = getElementsObserved(rawNode.initializer)
			if (result !== null) {
				return result
			}
		}

		// `a.map((b) => ...`, if `a` is observed, `b` is too.
		return getParameterObservedByCallBroadcasting(rawNode)
	}

	/** Broadcast observed from parent calling expression to all parameters. */
	function getParameterObservedByCallBroadcasting(rawNode: ts.ParameterDeclaration): boolean | null {

		// `a.b.map((item) => {return item.value})`
		// `a.b.map(item => item.value)`
		// `a.b.map(function(item){return item.value})`
		
		let fn = rawNode.parent
		if (!(ts.isFunctionExpression(fn)
			|| ts.isArrowFunction(fn)
		)) {
			return null
		}

		// Now enters parent scope.
		let calling = fn.parent
		if (!ts.isCallExpression(calling)) {
			return null
		}

		// `a.b.map`
		let exp = calling.expression
		if (!helper.access.isAccess(exp)) {
			return null
		}

		// `a.b` of `a.b.map`.
		if (!helper.access.isOfElementsAccess(exp)) {
			return null
		}

		// Must use parent scope.
		return getElementsObserved(exp.expression)
	}


	/** Whether a variable declaration should be observed. */
	function getVariableDeclarationObserved(rawNode: ts.VariableDeclaration): boolean | null {
		// `var a = {b:1} as Observed<{b: number}>`, observed.
		// `var a: Observed<{b: number}> = {b:1}`, observed.
		// Note here: `Observed` must appear directly, reference or alias is not working.

		let result: boolean | null
		
		// `var a = b.c`.
		// Closer to declaration, so check it firstly.
		if (rawNode.initializer) {
			result = getElementsObserved(rawNode.initializer)
			if (result !== null) {
				return result
			}
		}

		let typeNode = rawNode.type
		if (typeNode) {
			result = getTypeNodeObserved(typeNode)
			if (result !== null) {
				return result
			}
		}

		let type = helper.types.typeOf(rawNode)
		if (type) {
			result = getTypeObserved(type)
			if (result !== null) {
				return result
			}
		}

		// `for (item of items)`, broadcast observed from items to item.
		if (rawNode.parent
			&& ts.isVariableDeclarationList(rawNode.parent)
			&& ts.isForOfStatement(rawNode.parent.parent)
		) {
			return getElementsObserved(rawNode.parent.parent.expression)
		}

		return null
	}

	/** Test whether a binding element, like a of `{a} = ...`, `[a] = ...` should be observed. */
	function getBindingElementObserved(rawNode: ts.BindingElement): boolean | null {
		let result: boolean | null

		let decl = helper.findOutward(rawNode, ts.isVariableDeclaration)
		if (!decl) {
			return null
		}

		result = getVariableDeclarationObserved(decl)
		if (result !== null) {
			return result
		}

		// Would better if we walk to variable declaration and collect keys,
		// and then walk down follow keys at initializer.
		// Here we simply assume there would be very few deconstructed assignment elements.
		for (let item of helper.variable.walkDeconstructedDeclarationItems(decl)) {
			if (item.node.parent === rawNode) {
				if (item.initializer) {
					result = getElementsObserved(item.initializer)
					if (result !== null) {
						return result
					}
				}
			}
		}

		return null
	}


	/** 
	 * Returns whether a property accessing should be observed, for internal use only.
	 * `visitElements` specifies whether are visiting parent node of original to determine observed.
	 */
	function getAccessObserved(rawNode: AccessNode): boolean | null {
		let result: boolean | null

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
		if (decl) {

			// Always not observe method, it works like a value type.
			if (helper.isMethodLike(decl)) {
				return false
			}

			// Property declaration has specified as observed type or initializer is observed.
			result = getDeclarationObserved(decl)
			if (result !== null) {
				return result
			}
		}

		// Take type, e.g., for `node = a.b.c`, exp is `a.b`.
		let exp = rawNode.expression
		let expType = typeChecker.getTypeAtLocation(exp)

		// Visiting like string index will not get observed.
		if (helper.types.isValueType(expType)) {
			return false
		}

		return getElementsObserved(exp)
	}


	/** Test whether this is observed. */
	function getThisObserved(rawNode: ts.ThisExpression): boolean | null {

		// May resolve to this parameter, class declaration name.
		let decl = helper.symbol.resolveDeclaration(rawNode)
		if (!decl) {
			return null
		}

		return getDeclarationObserved(decl)
	}


	/** Check whether an identifier should be observed. */
	function getIdentifierObserved(rawNode: ts.Identifier): boolean | null {

		// May resolve to variable declaration, parameter declaration.
		let decl = helper.symbol.resolveDeclaration(rawNode)
		if (!decl) {
			return null
		}

		return getDeclarationObserved(decl)
	}

	
	/** Returns whether a call expression returned result should be observed. */
	function getCallObserved(rawNode: ts.CallExpression): boolean | null {
		let result: boolean | null

		let callExp = rawNode.expression
		let decl = helper.symbol.resolveDeclaration(callExp, helper.isFunctionLike)
		if (!decl) {
			return null
		}

		// Test call method returned type node.
		let returnTypeNode = decl.type
		if (returnTypeNode) {
			result = getTypeNodeObserved(returnTypeNode)
			if (result !== null) {
				return result
			}
		}

		// Test call method returned type.
		let returnType = helper.types.getReturnTypeOfSignature(decl)
		if (returnType) {
			result = getTypeObserved(returnType)
			if (result !== null) {
				return result
			}
		}

		// `this.map.get` of `this.map.get(x)`.
		// Result is observed.
		if (helper.access.isAccess(callExp)
			&& helper.access.isOfSingleElementReadAccess(callExp)
		) {
			let result = getElementsObserved(callExp.expression)
			if (result !== null) {
				return result
			}
		}

		// Here we plan to support more features like `Array.filter(...)`,
		// It's returned result is not observed, but it's elements is observed.
		// This breaks the normal observed state broadcasting mechanism,
		// so we have to separate observed state to several like:
		// `Itself-Observed` / `Itself-Not-Observed-But-Elements-Are`.
		// This brings two much complexity.

		return null
	}
}