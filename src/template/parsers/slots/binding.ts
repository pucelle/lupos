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

	declare name: string
	declare readonly modifiers: string[]

	// `:?binding=value`, detach binding if value is `null` or `undefined`.
	private withQueryToken: boolean = false

	/** :ref=${access | variable}. */
	private beRefAccess: boolean = false
	
	/** 
	 * After splitting like `:binding=${a, b}` or `:binding=${(a, b)}`.
	 * It includes query value for `:?binding=${a, b}`
	 */
	private parameterList: TS.Expression[] | null = []

	/** Binding constructor parameter count. */
	private implementsPart: boolean = false

	/** Binding constructor parameter count. */
	private bindClassParameterCount: number | null = null

	/** $latest_0 */
	private latestVariableNames: (string | null)[] | null = null

	/** $binding_0 */
	private previousBindingName: string | null = null

	/** $binding_0 */
	private bindingVariableName: string = ''

	/** $delegator_0 */
	private delegatorVariableName: string | null = null


	init() {
		if (this.name.startsWith('?')) {
			this.name = this.name.slice(1)
			this.withQueryToken = true
		}

		if (this.name === 'ref') {
			this.initRef()
		}

		if (!this.beRefAccess && this.valueIndices) {
			this.parameterList = this.template.values.getRawParameterList(this.valueIndices![0])
		}

		if (this.isAnyValueMutable()
			&& !this.beRefAccess
		) {
			let paramMutable = this.template.values.getRawParameterListMutable(this.parameterList!, this.valueIndices![0])

			this.latestVariableNames = paramMutable.map(mutable => {
				return mutable ? this.tree.makeUniqueLatestName() : null
			})
			
			this.makeGroupOfLatestNames()
		}

		this.bindingVariableName = this.tree.makeUniqueBindingName()
		this.initBindingClass()

		// Use a delegator to delegate binding part because it may be deleted.
		if (this.withQueryToken) {
			Modifier.addImport('PartDelegator', '@pucelle/lupos.js')
			this.delegatorVariableName = this.tree.makeUniqueDelegatorName()

			if (this.implementsPart) {
				this.tree.addPart(this.delegatorVariableName, this.node)
			}
		}
		else if (this.implementsPart) {
			this.tree.addPart(this.bindingVariableName, this.node)
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
			this.beRefAccess = true
			TrackingPatch.ignore(VisitTree.getIndex(rawValueNode))
		}

		// Remember latest binding name, must before getting current binding name.
		if (this.modifiers.includes('binding')) {
			this.previousBindingName = this.tree.makeLatestBindingName()
		}
	}

	/** Check binding class declaration. */
	private initBindingClass() {
		if (KnownInternalBindings[this.name]) {
			let item = KnownInternalBindings[this.name]
			
			// Add as a part.
			if (item.implementsPart) {
				this.implementsPart = true
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
				this.implementsPart = true
			}

			let bindingClassParams = bindingClass ? Helper.cls.getConstructorParameters(bindingClass) : null
			this.bindClassParameterCount = bindingClassParams ? bindingClassParams.length : null
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
		let bindingInit = this.createVariableAssignment(
			this.bindingVariableName,
			factory.createNewExpression(
				factory.createIdentifier(bindingClassName),
				undefined,
				bindingParams
			)
		)

		let init = [bindingInit]


		// let $delegator_0 = new PartDelegator()
		if (this.delegatorVariableName) {
			let delegatorPart = this.createVariableAssignment(
				this.delegatorVariableName,
				factory.createNewExpression(
					factory.createIdentifier('PartDelegator'),
					undefined,
					[]
				)
			)

			init.push(delegatorPart)
		}


		return init
	}

	outputUpdate() {

		// `[$values[0], $values[1]]`, or a single '...'
		let values = this.beRefAccess ? [factory.createNull()]
			: this.parameterList ? this.template.values.outputValueAsParameterList(this.parameterList, this.valueIndices![0])
			: [this.outputValue().joint]

		let queryValue: TS.Expression | null = null
		let paramValues = values
		let latestQueryParamVariableName = null
		let latestParamVariableNames = this.latestVariableNames

		if (this.withQueryToken) {
			queryValue = values[0]
			paramValues = values.slice(1)
			latestQueryParamVariableName = this.latestVariableNames?.[0] ?? null
			latestParamVariableNames = this.latestVariableNames?.slice(1) ?? null
		}

		let callWith: {method: string, values: TS.Expression[]} = {method: 'update', values: paramValues}
		if (this.name === 'class') {
			callWith = this.getClassUpdateCallWith(values[0])
		}
		else if (this.name === 'style') {
			callWith = this.getStyleUpdateCallWith(values[0])
		}
		else if (this.name === 'ref') {
			callWith.values = [this.getRefUpdateCallWithValue(values[0])]
		}

		let callMethod = callWith.method
		let callValues = callWith.values
		let update: TS.Statement | TS.Expression

		// if ($latest_0 !== $values[0]) {
		//	 $binding_0.callMethod(callValue)
		//	 $latest_0 = $values[0]
		// }
		if (latestParamVariableNames) {
			update = factory.createIfStatement(
				this.outputLatestComparison(latestParamVariableNames, paramValues),
				factory.createBlock(
					[
						factory.createExpressionStatement(factory.createCallExpression(
							factory.createPropertyAccessExpression(
								factory.createIdentifier(this.bindingVariableName),
								factory.createIdentifier(callMethod)
							),
							undefined,
							callValues
						)),
						...this.outputLatestAssignments(latestParamVariableNames, values),
					],
					true
				),
				undefined
			)
		}

		// $binding_0.update($values[0])
		else {
			update = factory.createCallExpression(
				factory.createPropertyAccessExpression(
					factory.createIdentifier(this.bindingVariableName),
					factory.createIdentifier(callMethod)
				),
				undefined,
				callValues
			)
		}

		
		if (this.delegatorVariableName) {
			return this.outputDelegator(queryValue!, latestQueryParamVariableName, update)
		}

		return update
	}

	private getClassUpdateCallWith(value: TS.Expression): {method: string, values: TS.Expression[]} {
		if (this.modifiers.length > 0) {
			return {
				method: 'updateObject',
				values: [factory.createObjectLiteralExpression(
					[factory.createPropertyAssignment(
						Helper.createPropertyName(this.modifiers[0]),
						value
					)],
					false
				)],
			}
		}

		if (!this.hasValueIndex()) {
			return {
				method: 'updateString',
				values: [value],
			}
		}

		let slotNode = this.getFirstRawValueNode()
		let slotNodeType = slotNode ? Helper.types.getType(slotNode) : null

		if (this.hasString() || Helper.types.isValueType(slotNodeType!)) {
			return {
				method: 'updateString',
				values: [value],
			}
		}
		else if (Helper.types.isArrayType(slotNodeType!)) {
			return {
				method: 'updateList',
				values: [value],
			}
		}
		else if (Helper.types.isObjectType(slotNodeType!)) {
			return {
				method: 'updateObject',
				values: [value],
			}
		}

		return {
			method: 'update',
			values: [value],
		}
	}

	private getStyleUpdateCallWith(value: TS.Expression): {method: string, values: TS.Expression[]} {
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
				values: [factory.createObjectLiteralExpression(
					[factory.createPropertyAssignment(
						Helper.createPropertyName(this.modifiers[0]),
						value
					)],
					false
				)],
			}
		}

		if (!this.hasValueIndex()) {
			return {
				method: 'updateString',
				values: [value],
			}
		}

		let slotNode = this.getFirstRawValueNode()
		let slotNodeType = slotNode ? Helper.types.getType(slotNode) : null

		if (this.hasString() || Helper.types.isValueType(slotNodeType!)) {
			return {
				method: 'updateString',
				values: [value],
			}
		}
		else if (Helper.types.isObjectType(slotNodeType!)) {
			return {
				method: 'updateObject',
				values: [value],
			}
		}

		return {
			method: 'update',
			values: [value],
		}
	}

	private getRefUpdateCallWithValue(value: TS.Expression | null): TS.Expression {
		let rawValueNode = this.getFirstRawValueNode()!

		// this.refName ->
		// function(){ this.refName = previousBinding }
		if (this.modifiers.includes('binding') && this.beRefAccess) {
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
		if (this.beRefAccess) {
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

	private outputDelegator(
		queryValue: TS.Expression,
		latestQueryParamVariableName: string | null,
		update: TS.Statement | TS.Expression
	) {
		// if ($values[0]) {
		//   NormalUpdateLogic
		// }

		// if ($values[0] && !$latest_0) {
		//   $delegator_0.update($binding_0)
		//   $latest_0 = $values[0]
		// }
		// else if (!$values[0] && $latest_0) {
		//   $delegator_0.update(null)
		//   $latest_0 = $values[0]
		// }
		// 

		let updateIf = factory.createIfStatement(
			queryValue,
			factory.createBlock(
				[Helper.pack.toStatement(update)],
				true
			),
			undefined
		)
		
		let compare: TS.Statement | null = null
		if (latestQueryParamVariableName) {
			compare = factory.createIfStatement(
				factory.createBinaryExpression(
					queryValue,
					factory.createToken(ts.SyntaxKind.AmpersandAmpersandToken),
					factory.createPrefixUnaryExpression(
						ts.SyntaxKind.ExclamationToken,
						factory.createIdentifier(latestQueryParamVariableName)
					)
				),
				factory.createBlock(
					[
					factory.createExpressionStatement(factory.createCallExpression(
						factory.createPropertyAccessExpression(
							factory.createIdentifier(this.delegatorVariableName!),
							factory.createIdentifier('update')
						),
						undefined,
						[factory.createIdentifier(this.bindingVariableName)]
					)),
					factory.createExpressionStatement(factory.createBinaryExpression(
						factory.createIdentifier(latestQueryParamVariableName),
						factory.createToken(ts.SyntaxKind.EqualsToken),
						queryValue
					))
					],
					true
				),
				factory.createIfStatement(
					factory.createBinaryExpression(
						factory.createPrefixUnaryExpression(
							ts.SyntaxKind.ExclamationToken,
							queryValue
						),
						factory.createToken(ts.SyntaxKind.AmpersandAmpersandToken),
						factory.createIdentifier(latestQueryParamVariableName)
					),
					factory.createBlock(
					[
						factory.createExpressionStatement(factory.createCallExpression(
							factory.createPropertyAccessExpression(
								factory.createIdentifier(this.delegatorVariableName!),
								factory.createIdentifier('update')
							),
							undefined,
							[factory.createNull()]
						)),
						factory.createExpressionStatement(factory.createBinaryExpression(
							factory.createIdentifier(latestQueryParamVariableName),
							factory.createToken(ts.SyntaxKind.EqualsToken),
							queryValue
						))
					],
					true
					),
					undefined
				)
			)
		}
		
		return [
			updateIf,
			...(compare ? [compare] : []),
		]
	}
}