import type TS from 'typescript'
import {SlotParserBase} from './base'
import {factory, ts, Helper, TemplateSlotPlaceholder, ScopeTree, Modifier, VisitTree} from '../../../base'
import {VariableNames} from '../variable-names'
import {addToList} from '../../../utils'
import {TrackingPatch} from '../../../ff'


/** Known bindings from lupos.js. */
const KnownInternalBindings: Record<string, {name: string, parameterCount: number, implementsPart: boolean}> = {
	class: {name: 'ClassBinding', parameterCount: 1, implementsPart: false},
	html: {name: 'HTMLBinding', parameterCount: 1, implementsPart: false},
	ref: {name: 'RefBinding', parameterCount: 3, implementsPart: true},
	slot: {name: 'SlotBinding', parameterCount: 1, implementsPart: true},
	style: {name: 'StyleBinding', parameterCount: 1, implementsPart: false},
	transition: {name: 'TransitionBinding', parameterCount: 3, implementsPart: true},
}


export class BindingSlotParser extends SlotParserBase {

	declare readonly name: string
	declare readonly modifiers: string[]

	private bindClassParameterCount: number | null = null

	/** $latest_0 */
	private latestVariableName: string | null = null

	/** $binding_0 */
	private previousBindingName: string | null = null

	/** $binding_0 */
	private bindingVariableName: string = ''

	/** :ref=${access | variable}. */
	private refAccess: boolean = false

	init() {
		if (this.name === 'ref') {
			this.initRef()
		}

		if (this.isValueMutable()
			&& !this.refAccess
		) {
			this.latestVariableName = this.tree.getUniqueLatestName()
		}

		this.bindingVariableName = this.tree.getUniqueBindingName()
		this.initBindingClass()
	}

	/** Check binding class declaration. */
	private initBindingClass() {
		if (KnownInternalBindings[this.name]) {
			let item = KnownInternalBindings[this.name]
			
			// Add as a part.
			if (item.implementsPart) {
				this.tree.addPart(this.bindingVariableName, this.node)
			}

			// Import binding class.
			Modifier.addImport(item.name, '@pucelle/lupos.js') 

			// Remember class parameter count.
			this.bindClassParameterCount = item.parameterCount
		}

		else {

			// :bindingName -> bindingName
			let bindingClassDecl = ScopeTree.getDeclarationByName(this.name, this.template.rawNode)

			// `Import ClassBinding`
			// `class ClassBinding {...}`
			if (!bindingClassDecl
				|| (
					!ts.isImportSpecifier(bindingClassDecl)
					&& !(ts.isClassDeclaration(bindingClassDecl))
				)
				|| !bindingClassDecl.name
			) {
				throw new Error(`Please make sure to import or declare "${this.name}"!`)
			}

			let bindingModuleName = Helper.symbol.resolveImport(bindingClassDecl)
			let bindingClass = Helper.symbol.resolveDeclaration(bindingClassDecl, ts.isClassDeclaration)!

			this.template.addRefedDeclaration(bindingClassDecl)

			if (bindingClass && Helper.cls.isImplemented(bindingClass, 'Part', '@pucelle/lupos.js', bindingModuleName?.moduleName)) {
				this.tree.addPart(this.bindingVariableName, this.node)
			}

			let bindingClassParams = bindingClass ? Helper.cls.getConstructorParameters(bindingClass) : null

			this.bindClassParameterCount = bindingClassParams ? bindingClassParams.length : null
		}
	}

	private initRef() {
		
		// If declare property as `XXXElement`, force ref element.
		let rawValueNode = this.getFirstRawValueNode()
		if (rawValueNode && TemplateSlotPlaceholder.isComponent(this.node.tagName!)) {
			let type = Helper.types.getType(rawValueNode)
			let typeText = Helper.types.getTypeFullText(type)

			if (/^\w*?Element$/.test(typeText)) {
				addToList(this.modifiers, 'el')
			}
		}

		// Will be compiled as a function and become static.
		if (rawValueNode &&
			(Helper.access.isAccess(rawValueNode)
				|| Helper.variable.isVariableIdentifier(rawValueNode)
			)
		) {
			this.refAccess = true
			TrackingPatch.ignore(VisitTree.getIndex(rawValueNode))
		}

		// Remember latest binding name, must before getting current binding name.
		if (this.modifiers.includes('binding')) {
			this.previousBindingName = this.tree.getLatestBindingName()
		}
	}

	outputInit() {
		let nodeName = this.getRefedNodeName()
		let bindingParamCount = this.bindClassParameterCount
		let bindingClassName = KnownInternalBindings[this.name] ? KnownInternalBindings[this.name].name : this.name
		let bindingParams: TS.Expression[] = [factory.createIdentifier(nodeName)]

		// Need `context` parameter
		if (bindingParamCount === null || bindingParamCount > 1) {
			bindingParams.push(factory.createIdentifier(VariableNames.context))
		}

		// Need `modifiers` parameter
		if (bindingParamCount === null || bindingParamCount > 2 && this.modifiers.length > 0) {
			bindingParams.push(factory.createArrayLiteralExpression(
				this.modifiers.map(m => factory.createStringLiteral(m)),
				false
			))
		}

		// let $binding_0 = new ClassBinding($node_0, ?context, ?modifiers)
		return this.createVariableAssignment(
			this.bindingVariableName,
			factory.createNewExpression(
				factory.createIdentifier(bindingClassName),
				undefined,
				bindingParams
			)
		)
	}

	outputUpdate() {

		// $values[0], or '...'
		let value = this.refAccess ? null : this.outputValue()

		let callWith: {method: string, value: TS.Expression} = {method: 'update', value: value!}
		if (this.name === 'class') {
			callWith = this.getClassUpdateCallWith(value!)
		}
		else if (this.name === 'style') {
			callWith = this.getStyleUpdateCallWith(value!)
		}
		else if (this.name === 'ref') {
			callWith.value = this.getRefUpdateCallWithValue(value)
		}

		let callMethod = callWith.method
		let callValue = callWith.value

		// if ($latest_0 !== $values[0]) {
		//	 $binding_0.callMethod(callValue)
		//	 $latest_0 = $values[0]
		// }
		if (this.latestVariableName && callValue !== value) {
			let compareValue = this.outputValueForComparing()

			return factory.createIfStatement(
				factory.createBinaryExpression(
					factory.createIdentifier(this.latestVariableName),
					factory.createToken(ts.SyntaxKind.ExclamationEqualsEqualsToken),
					compareValue
				),
				factory.createBlock(
					[
						factory.createExpressionStatement(factory.createCallExpression(
							factory.createPropertyAccessExpression(
								factory.createIdentifier(this.bindingVariableName),
								factory.createIdentifier(callMethod)
							),
							undefined,
							[callValue]
						)),
						factory.createExpressionStatement(factory.createBinaryExpression(
							factory.createIdentifier(this.latestVariableName),
							factory.createToken(ts.SyntaxKind.EqualsToken),
							compareValue
						))
					],
					true
				),
				undefined
			)
		}

		// if ($latest_0 !== $values[0]) {
		//    $binding_0.callMethod($latest_0 = $values[0])
		// }
		else if (this.latestVariableName) {
			return factory.createIfStatement(
				factory.createBinaryExpression(
					factory.createIdentifier(this.latestVariableName),
					factory.createToken(ts.SyntaxKind.ExclamationEqualsEqualsToken),
					value!
				),
				factory.createBlock(
					[
						factory.createExpressionStatement(factory.createCallExpression(
							factory.createPropertyAccessExpression(
								factory.createIdentifier(this.bindingVariableName),
								factory.createIdentifier(callMethod)
							),
							undefined,
							[factory.createBinaryExpression(
								factory.createIdentifier(this.latestVariableName),
								factory.createToken(ts.SyntaxKind.EqualsToken),
								callValue
							)]
						))
					],
					true
				),
				undefined
			)
		}

		// $binding_0.update($values[0])
		else {
			return factory.createCallExpression(
				factory.createPropertyAccessExpression(
					factory.createIdentifier(this.bindingVariableName),
					factory.createIdentifier(callMethod)
				),
				undefined,
				[callValue]
			)
		}
	}

	private getClassUpdateCallWith(value: TS.Expression): {method: string, value: TS.Expression} {
		if (this.modifiers.length > 0) {
			return {
				method: 'updateObject',
				value: factory.createObjectLiteralExpression(
					[factory.createPropertyAssignment(
						Helper.createPropertyName(this.modifiers[0]),
						value
					)],
					false
				),
			}
		}

		if (!this.hasValueIndex()) {
			return {
				method: 'updateString',
				value,
			}
		}

		let slotNode = this.getFirstRawValueNode()
		let slotNodeType = slotNode ? Helper.types.getType(slotNode) : null

		if (this.hasString() || Helper.types.isValueType(slotNodeType!)) {
			return {
				method: 'updateString',
				value,
			}
		}
		else if (Helper.types.isArrayType(slotNodeType!)) {
			return {
				method: 'updateList',
				value,
			}
		}
		else if (Helper.types.isObjectType(slotNodeType!)) {
			return {
				method: 'updateObject',
				value,
			}
		}

		return {
			method: 'update',
			value
		}
	}

	private getStyleUpdateCallWith(value: TS.Expression): {method: string, value: TS.Expression} {
		if (this.modifiers.length > 0) {
			if (this.modifiers.length > 1 && this.modifiers[1].length > 0) {

				// `.url` -> `url(...)`
				if (this.modifiers[1] === 'url') {
					value = factory.createBinaryExpression(
						factory.createBinaryExpression(
							factory.createStringLiteral('url('),
							factory.createToken(ts.SyntaxKind.PlusToken),
							value
						),
						factory.createToken(ts.SyntaxKind.PlusToken),
						factory.createStringLiteral(')')
					)
				}

				// `.percent`
				else if (this.modifiers[1] === 'percent') {
					value = factory.createBinaryExpression(
						value,
						factory.createToken(ts.SyntaxKind.PlusToken),
						factory.createStringLiteral('%')
					)
				}

				// `.px`, `.rem`, ...
				else if (/^\w+$/.test(this.modifiers[1])) {
					value = factory.createBinaryExpression(
						value,
						factory.createToken(ts.SyntaxKind.PlusToken),
						factory.createStringLiteral(this.modifiers[1])
					)
				}
			}

			return {
				method: 'updateObject',
				value: factory.createObjectLiteralExpression(
					[factory.createPropertyAssignment(
						Helper.createPropertyName(this.modifiers[0]),
						value
					)],
					false
				),
			}
		}

		if (!this.hasValueIndex()) {
			return {
				method: 'updateString',
				value,
			}
		}

		let slotNode = this.getFirstRawValueNode()
		let slotNodeType = slotNode ? Helper.types.getType(slotNode) : null

		if (this.hasString() || Helper.types.isValueType(slotNodeType!)) {
			return {
				method: 'updateString',
				value,
			}
		}
		else if (Helper.types.isObjectType(slotNodeType!)) {
			return {
				method: 'updateObject',
				value,
			}
		}

		return {
			method: 'update',
			value
		}
	}

	private getRefUpdateCallWithValue(value: TS.Expression | null): TS.Expression {
		let rawValueNode = this.getFirstRawValueNode()!

		// this.refName ->
		// function(){ this.refName = previousBinding }
		if (this.modifiers.includes('binding') && this.refAccess) {
			return factory.createFunctionExpression(
				undefined,
				undefined,
				factory.createIdentifier(''),
				undefined,
				[],
				undefined,
				factory.createBlock(
					[
						factory.createExpressionStatement(factory.createBinaryExpression(
							rawValueNode,
							factory.createToken(ts.SyntaxKind.EqualsToken),
							factory.createIdentifier(this.previousBindingName!)
						)),
						...Helper.pack.toStatements(TrackingPatch.outputIsolatedTracking(rawValueNode, 'set'))
					],
					false
				)
			)
		}

		// this.refName ->
		// function(refed){ this.refName = refed }
		if (this.refAccess) {
			return factory.createFunctionExpression(
				undefined,
				undefined,
				factory.createIdentifier(''),
				undefined,
				[factory.createParameterDeclaration(
					undefined,
					undefined,
					factory.createIdentifier('refed'),
					undefined,
					undefined,
					undefined
				)],
				undefined,
				factory.createBlock(
					[
						factory.createExpressionStatement(factory.createBinaryExpression(
							rawValueNode,
							factory.createToken(ts.SyntaxKind.EqualsToken),
							factory.createIdentifier('refed')
						)),
						...Helper.pack.toStatements(TrackingPatch.outputIsolatedTracking(rawValueNode, 'set'))
					],
					false
				)
			)
		}

		// () => {...}
		return value!
	}
}