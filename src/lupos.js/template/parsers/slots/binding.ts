import type TS from 'typescript'
import {SlotParserBase} from './base'
import {factory, ts, Imports, Helper, TemplateSlotPlaceholder} from '../../../../base'
import {VariableNames} from '../variable-names'
import {addToList, toCamelCase, toCapitalize} from '../../../../utils'


export class BindingSlotParser extends SlotParserBase {

	declare readonly name: string
	declare readonly modifiers: string[]

	/** $latest_0 */
	private latestVariableName: string | null = null

	/** $binding_0 */
	private bindingVariableName: string = ''

	/** Force output value node for ref binding. */
	private forceRefStatic: boolean = false

	init() {
		if (this.name === 'ref') {
			this.initRef()
		}

		if (this.isValueMutable()
			&& !this.forceRefStatic
			&& this.name !== 'transition'	// transition value always change.
		) {
			this.latestVariableName = this.treeParser.getUniqueLatestName()
		}

		this.bindingVariableName = this.treeParser.getUniqueBindingName()
	}

	private initRef() {
		
		// If declare property as `XXXElement`, force ref element.
		let rawValueNode = this.getFirstValueNode()
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
			this.forceRefStatic = true
		}
	}

	outputInit() {
		let nodeName = this.getRefedNodeName()

		// :class -> ClassBinding
		let bindingClassImport = Imports.getImportByName(this.name)
			|| Imports.getImportByName(toCapitalize(toCamelCase(this.name)) + 'Binding')!
		
		if (!bindingClassImport) {
			throw new Error(`Please make sure to import "${this.name}" or "${toCapitalize(toCamelCase(this.name)) + 'Binding'}"`)
		}

		let bindingClassName = bindingClassImport.name.text
		let bindingClass = Helper.symbol.resolveDeclaration(bindingClassImport, ts.isClassDeclaration)!

		let bindingClassParams = bindingClass ? Helper.cls.getConstructorParameters(bindingClass) : undefined
		let bindingParams: TS.Expression[] = [factory.createIdentifier(nodeName)]

		// Need `context` parameter
		if (!bindingClassParams || bindingClassParams.length > 1) {
			bindingParams.push(factory.createIdentifier(VariableNames.context))
		}

		// Need `modifiers` parameter
		if (!bindingClassParams || bindingClassParams.length > 2 && this.modifiers.length > 0) {
			bindingParams.push(factory.createArrayLiteralExpression(
				this.modifiers.map(m => factory.createStringLiteral(m)),
				false
			))
		}

		// let $binding_0 = new ClassBinding($node_0, ?context, ?modifiers)
		return factory.createVariableStatement(
			undefined,
			factory.createVariableDeclarationList(
				[factory.createVariableDeclaration(
				factory.createIdentifier(this.bindingVariableName),
				undefined,
				undefined,
				factory.createNewExpression(
					factory.createIdentifier(bindingClassName),
					undefined,
					bindingParams
				)
				)],
				ts.NodeFlags.Let
			)
		)
	}

	outputUpdate() {

		// $values[0], or '...'
		let value = this.forceRefStatic ? null : this.outputValue()

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
							[callValue]
						)),
						factory.createExpressionStatement(factory.createBinaryExpression(
							factory.createIdentifier(this.latestVariableName),
							factory.createToken(ts.SyntaxKind.EqualsToken),
							value!
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
						this.modifiers[0],
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

		let slotNode = this.getFirstValueNode()
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
						this.modifiers[0],
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

		let slotNode = this.getFirstValueNode()
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
		let rawValueNode = this.getFirstValueNode()!

		// this.refName ->
		// (el) => this.refName = el
		if (this.forceRefStatic) {
			return factory.createArrowFunction(
				undefined,
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
				factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
				factory.createBinaryExpression(
					rawValueNode,
					factory.createToken(ts.SyntaxKind.EqualsToken),
					factory.createIdentifier('refed')
				)
			)
		}

		// () => {...}
		return value!
	}
}