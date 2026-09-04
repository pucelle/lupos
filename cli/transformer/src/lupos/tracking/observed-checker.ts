import ts from 'typescript'
import {AccessNode} from '../../lupos-ts-module'
import {createTransformSessionStateKey, transformContext, transformSession} from '../../core'
import {GenericType} from 'typescript'
import {TrackingPatch} from './patch'
import {ObservedStateMask} from '../decorators/types'


type ObservedState = boolean | null

interface ObservedCheckerState {
	self: WeakMap<ts.Node, ObservedState>
	elements: WeakMap<ts.Expression, ObservedState>
	iteratedElements: WeakMap<ts.Expression, ObservedState>
	declarations: WeakMap<ts.Declaration, ObservedState>
}

const StateKey = createTransformSessionStateKey<ObservedCheckerState>('ObservedChecker')

function getState(): ObservedCheckerState {
	return transformSession.getState(StateKey, () => ({
		self: new WeakMap(),
		elements: new WeakMap(),
		iteratedElements: new WeakMap(),
		declarations: new WeakMap(),
	}))
}

const ShallowArrayCopyMethodNames = new Set([
	'filter',
	'slice',
	'toReversed',
	'toSorted',
	'toSpliced',
])

const SameArrayMethodNames = new Set([
	'reverse',
	'sort',
])


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
		let cache = getState().self
		let cached = cache.get(rawNode)
		if (cached !== undefined) {
			return cached
		}

		// Break recursive query cycles while computing this node.
		cache.set(rawNode, null)
		let observed = computeSelfObserved(rawNode)
		cache.set(rawNode, observed)

		return observed
	}

	function computeSelfObserved(rawNode: ts.Node): boolean | null {

		// Must be access node.
		if (!transformContext.helper.access.isAccess(rawNode)) {
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
		if (transformContext.helper.symbol.isOfTypescriptLib(rawNode)) {
			return false
		}

		// Will not observe properties for those starts with '$' like `a.$b`, `a.$b.c`.
		if (transformContext.helper.access.getPropertyText(rawNode).startsWith('$')) {
			return false
		}


		// As readonly property, not mutable.
		let readonly = transformContext.helper.types.isReadonly(rawNode)
		if (readonly) {
			return false
		}


		// Test declaration.
		let decl = transformContext.helper.symbol.resolveDeclaration(rawNode)

		// Method declarations will always not mutable.
		if (decl && transformContext.helper.isMethodLike(decl)) {
			return false
		}

		// Ignores get and set accessors, because getter or setter
		// include tracking logics in access body.
		// But `@computed` decorated will continue, because it's
		// content get cached after get computed.
		if (decl && ts.isAccessor(decl)) {
			let decoNameBeComputed = transformContext.helper.deco.getFirstName(decl) === 'computed'
			if (!decoNameBeComputed) {
				return false
			}
		}
		
		
		// Take `node = string[0]` as example, exp is `string`.
		let exp = rawNode.expression
		let expType = transformContext.helper.types.typeChecker.getTypeAtLocation(exp)

		// Visiting like string index will not get observed.
		if (transformContext.helper.types.isValueType(expType)) {
			return false
		}


		// Then resolve from access chain.
		// Normally if parent expression is observed, child is mutable.
		let elementsObserved = getElementsObserved(rawNode.expression)
		if (elementsObserved !== null) {
			return elementsObserved
		}


		// At last try to resolve from declaration.
		// Sometimes when searching from parent expression may not work
		// because it may search at a returned generic type.
		// Should re-search at access declaration resolved.
		if (decl
			&& transformContext.helper.isPropertyLike(decl)
			&& ts.isClassLike(decl.parent)
		) {
			let declParentClassObserved = getDeclarationObserved(decl.parent)
			if (declParentClassObserved !== null) {
				return declParentClassObserved
			}
		}

		return null
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
		let cache = getState().elements
		let cached = cache.get(rawNode)
		if (cached !== undefined) {
			return cached
		}

		// Break recursive query cycles while computing this node.
		cache.set(rawNode, null)
		let observed = computeElementsObserved(rawNode)
		cache.set(rawNode, observed)

		return observed
	}

	/**
	 * Returns whether values yielded from a collection have observed properties.
	 *
	 * This is intentionally independent from `getElementsObserved`: a shallow
	 * copy such as `observedList.filter(...)` is a new, unobserved array, while
	 * the objects retained in that array are still observed.
	 */
	export function getIteratedElementsObserved(rawNode: ts.Expression): boolean | null {
		let cache = getState().iteratedElements
		let cached = cache.get(rawNode)
		if (cached !== undefined) {
			return cached
		}

		cache.set(rawNode, null)
		let observed = computeIteratedElementsObserved(rawNode)
		cache.set(rawNode, observed)

		return observed
	}

	function computeIteratedElementsObserved(rawNode: ts.Expression): boolean | null {
		// Normal observation always broadcasts from a collection to its children.
		let directlyObserved = getElementsObserved(rawNode)
		if (directlyObserved !== null) {
			return directlyObserved
		}

		if (ts.isParenthesizedExpression(rawNode)
			|| ts.isNonNullExpression(rawNode)
			|| ts.isAsExpression(rawNode)
		) {
			return getIteratedElementsObserved(rawNode.expression)
		}

		if (ts.isIdentifier(rawNode)) {
			let decl = transformContext.helper.symbol.resolveDeclaration(rawNode)
			if (decl) {
				return getDeclarationIteratedElementsObserved(decl)
			}
		}

		if (ts.isCallExpression(rawNode)) {
			let arrayMethod = getArrayMethod(rawNode)
			if (arrayMethod) {
				let {name, receiver} = arrayMethod

				if (ShallowArrayCopyMethodNames.has(name) || SameArrayMethodNames.has(name)) {
					return getIteratedElementsObserved(receiver)
				}

				if (name === 'concat') {
					let states = [
						getIteratedElementsObserved(receiver),
						...rawNode.arguments.map(getConcatArgumentElementsObserved),
					]
					return mergeObservedStates(states)
				}
			}
		}

		if (ts.isArrayLiteralExpression(rawNode)) {
			let states = rawNode.elements.map(element => {
				return ts.isSpreadElement(element)
					? getIteratedElementsObserved(element.expression)
					: getElementsObserved(element)
			})
			return mergeObservedStates(states)
		}

		if (ts.isConditionalExpression(rawNode)) {
			return mergeObservedStates([
				getIteratedElementsObserved(rawNode.whenTrue),
				getIteratedElementsObserved(rawNode.whenFalse),
			])
		}

		if (ts.isBinaryExpression(rawNode)
			&& (rawNode.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
				|| rawNode.operatorToken.kind === ts.SyntaxKind.BarBarToken
				|| rawNode.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
			)
		) {
			return mergeObservedStates([
				getIteratedElementsObserved(rawNode.left),
				getIteratedElementsObserved(rawNode.right),
			])
		}

		return null
	}

	function getDeclarationIteratedElementsObserved(decl: ts.Declaration): boolean | null {
		if (ts.isVariableDeclaration(decl) && decl.initializer) {
			return getIteratedElementsObserved(decl.initializer)
		}

		if (ts.isBindingElement(decl)) {
			let variableDecl = transformContext.helper.findOutward(decl, ts.isVariableDeclaration)
			if (variableDecl?.initializer) {
				for (let current: ts.Node = decl; current !== variableDecl; current = current.parent) {
					if (ts.isArrayBindingPattern(current.parent)) {
						return getIteratedElementsObserved(variableDecl.initializer)
					}
				}
			}
		}

		return null
	}

	function getConcatArgumentElementsObserved(rawNode: ts.Expression): boolean | null {
		let type = transformContext.helper.types.typeChecker.getTypeAtLocation(rawNode)
		return transformContext.helper.types.typeChecker.isArrayType(type)
			? getIteratedElementsObserved(rawNode)
			: getElementsObserved(rawNode)
	}

	function mergeObservedStates(states: ObservedState[]): ObservedState {
		if (states.some(state => state === true)) {
			return true
		}

		return states.length > 0 && states.every(state => state === false)
			? false
			: null
	}

	function getArrayMethod(rawNode: ts.CallExpression): {name: string, receiver: ts.Expression} | null {
		let callExp = rawNode.expression
		if (!transformContext.helper.access.isAccess(callExp)) {
			return null
		}

		let decl = transformContext.helper.symbol.resolveDeclaration(callExp, transformContext.helper.isMethodLike)
		if (!decl || !ts.isClassLike(decl.parent) && !ts.isInterfaceDeclaration(decl.parent)) {
			return null
		}

		let className = decl.parent.name && transformContext.helper.getText(decl.parent.name)
		if (className !== 'Array' && className !== 'ReadonlyArray') {
			return null
		}

		return {
			name: transformContext.helper.getText(decl.name),
			receiver: callExp.expression,
		}
	}

	function computeElementsObserved(rawNode: ts.Expression): boolean | null {

		// Force track.
		if (TrackingPatch.isForceTrackedAs(rawNode, ObservedStateMask.Elements)) {
			return true
		}

		// `a.b`
		// `(a ? b : c).d`
		// `(a ?? b).b`
		if (transformContext.helper.access.isAccess(rawNode)) {
			return getAccessObserved(rawNode)
		}

		// `this`
		else if (transformContext.helper.isThis(rawNode)) {
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
		// `[...] as const`
		else if (ts.isAsExpression(rawNode)) {
			let typeNode = rawNode.type
			if (!typeNode) {
				return null
			}

			// `[...] as const`, all child element immutable.
			if (ts.isTypeReferenceNode(typeNode)
				&& ts.isIdentifier(typeNode.typeName)
				&& transformContext.helper.getText(typeNode.typeName) === 'const'
			) {
				return false
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
			let decl = transformContext.helper.symbol.resolveDeclaration(rawNode.expression)
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
		else if (transformContext.helper.symbol.isImportedFrom(typeNode, 'Observed', 'lupos')) {
			return true
		}

		// `UnObserved<>`
		else if (transformContext.helper.symbol.isImportedFrom(typeNode, 'UnObserved', 'lupos')) {
			return false
		}

		// Resolve from type node.
		else {
			let resolveFrom: ts.Node = typeNode

			// Resolve type reference name.
			if (ts.isTypeReferenceNode(typeNode)) {
				resolveFrom = typeNode.typeName
			}

			let decl = transformContext.helper.symbol.resolveDeclaration(resolveFrom)
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
		else if (transformContext.helper.types.typeChecker.isArrayType(type)) {
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

			let decl = transformContext.helper.symbol.resolveDeclarationBySymbol(symbol)
			if (!decl) {
				return null
			}

			return getDeclarationObserved(decl)
		}
	}

	/** Whether resolved declaration should be observed. */
	function getDeclarationObserved(decl: ts.Declaration): boolean | null {
		let cache = getState().declarations
		let cached = cache.get(decl)
		if (cached !== undefined) {
			return cached
		}

		// Break recursive declaration/type query cycles while computing this node.
		cache.set(decl, null)
		let observed = computeDeclarationObserved(decl)
		cache.set(decl, observed)

		return observed
	}

	function computeDeclarationObserved(decl: ts.Declaration): boolean | null {
				
		// Force track.
		if (TrackingPatch.isForceTrackedAs(decl, ObservedStateMask.Elements)) {
			return true
		}

		// Properties
		// `class A{p: Observed}` -> `this.p` and `this['p']` is observed.
		// `interface A{p: Observed}` -> `this.p` and `this['p']` is observed.
		if (transformContext.helper.isPropertyOrGetAccessor(decl)) {
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
			let firstDerived = transformContext.helper.objectLike.getFirstDerivedOf(decl, ['Observed', 'UnObserved'], 'lupos')
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
			let firstImplemented = transformContext.helper.class.getFirstImplementedOf(decl, ['Observed', 'UnObserved'], 'lupos')
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
			let returnType = transformContext.helper.types.getReturnTypeOfSignature(decl)
			if (returnType) {
				result = getTypeObserved(returnType)
				if (result !== null) {
					return result
				}
			}
		}

		if (ts.isPropertyDeclaration(decl)
			&& decl.initializer
		) {
			// `readonly prop: XXX = [...] as const`, all child element immutable.
			if (ts.isAsExpression(decl.initializer)) {
				let readonly = !!decl.modifiers?.some(m => m.kind === ts.SyntaxKind.ReadonlyKeyword)
				if (readonly
					&& ts.isTypeReferenceNode(decl.initializer.type)
					&& ts.isIdentifier(decl.initializer.type.typeName)
					&& transformContext.helper.getText(decl.initializer.type.typeName) === 'const'
				) {
					return false
				}
			}

			// `class A{p = {} as Observed}`, must not specified property type.
			if (!typeNode) {
				result = getElementsObserved(decl.initializer)
				if (result !== null) {
					return result
				}
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
		if (!transformContext.helper.access.isAccess(exp)) {
			return null
		}

		// `a.b` of `a.b.map`.
		if (!transformContext.helper.access.isOfElementsAccess(exp)) {
			return null
		}

		let arrayMethod = getArrayMethod(calling)
		if (arrayMethod) {
			let parameterIndex = fn.parameters.indexOf(rawNode)
			let elementParameterIndices = arrayMethod.name === 'reduce' || arrayMethod.name === 'reduceRight'
				? [1]
				: arrayMethod.name === 'sort' || arrayMethod.name === 'toSorted'
					? [0, 1]
					: [0]

			if (elementParameterIndices.includes(parameterIndex)) {
				return getIteratedElementsObserved(arrayMethod.receiver)
			}
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

		let type = transformContext.helper.types.typeOf(rawNode)
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
			return getIteratedElementsObserved(rawNode.parent.parent.expression)
		}

		return null
	}

	/** Test whether a binding element, like a of `{a} = ...`, `[a] = ...` should be observed. */
	function getBindingElementObserved(rawNode: ts.BindingElement): boolean | null {
		let result: boolean | null

		let decl = transformContext.helper.findOutward(rawNode, ts.isVariableDeclaration)
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
		for (let item of transformContext.helper.variable.walkDeconstructedDeclarationItems(decl)) {
			if (item.node.parent === rawNode) {
				if (item.initializer) {
					result = typeof item.keys[0] === 'number'
						? getIteratedElementsObserved(item.initializer)
						: getElementsObserved(item.initializer)
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
		if (transformContext.helper.symbol.isOfTypescriptLib(rawNode)) {
			return false
		}

		// Will not observe sub properties for those starts with '$' like `a.$b`, `a.$b.c`.
		if (transformContext.helper.access.getPropertyText(rawNode).startsWith('$')) {
			return false
		}

		// Readonly elements are not observed.
		let elementsReadonly = transformContext.helper.types.isElementsReadonly(rawNode)
		if (elementsReadonly) {
			return false
		}


		// Test declaration.
		let decl = transformContext.helper.symbol.resolveDeclaration(rawNode)
		if (decl) {

			// Always not observe method, it works like a value type.
			if (transformContext.helper.isMethodLike(decl)) {
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
		let expType = transformContext.helper.types.typeChecker.getTypeAtLocation(exp)

		// Visiting like string index will not get observed.
		if (transformContext.helper.types.isValueType(expType)) {
			return false
		}

		// `items[0]` returns a child value. A derived collection may itself be
		// unobserved while still retaining observed child objects.
		if (ts.isElementAccessExpression(rawNode)) {
			result = getIteratedElementsObserved(exp)
			if (result !== null) {
				return result
			}
		}

		return getElementsObserved(exp)
	}


	/** Test whether this is observed. */
	function getThisObserved(rawNode: ts.ThisExpression): boolean | null {

		// May resolve to this parameter, class declaration name.
		let decl = transformContext.helper.symbol.resolveDeclaration(rawNode)
		if (!decl) {
			return null
		}

		return getDeclarationObserved(decl)
	}


	/** Check whether an identifier should be observed. */
	function getIdentifierObserved(rawNode: ts.Identifier): boolean | null {

		// May resolve to variable declaration, parameter declaration.
		let decl = transformContext.helper.symbol.resolveDeclaration(rawNode)
		if (!decl) {
			return null
		}

		return getDeclarationObserved(decl)
	}

	
	/** Returns whether a call expression returned result should be observed. */
	function getCallObserved(rawNode: ts.CallExpression): boolean | null {
		let result: boolean | null

		let callExp = rawNode.expression
		let decl = transformContext.helper.symbol.resolveDeclaration(callExp, transformContext.helper.isFunctionLike)
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
		let returnType = transformContext.helper.types.getReturnTypeOfSignature(decl)
		if (returnType) {
			result = getTypeObserved(returnType)
			if (result !== null) {
				return result
			}
		}

		// `this.map.get` of `this.map.get(x)`.
		// Result is observed.
		if (transformContext.helper.access.isAccess(callExp)
			&& transformContext.helper.access.isOfSingleElementReadAccess(callExp)
		) {
			let result = getIteratedElementsObserved(callExp.expression)
			if (result !== null) {
				return result
			}
		}

		let arrayMethod = getArrayMethod(rawNode)
		if (arrayMethod && SameArrayMethodNames.has(arrayMethod.name)) {
			return getElementsObserved(arrayMethod.receiver)
		}

		return null
	}
}
