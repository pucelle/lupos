import type TS from 'typescript'
import {SlotBase} from './base'
import {factory, ts, imports, helper} from '../../../../base'
import {VariableNames} from '../variable-names'


export class BindingSlot extends SlotBase {

	declare readonly name: string
	declare readonly modifiers: string[]

	/** $latest_0 */
	private latestVariableName: string | null = null

	/** $binding_0 */
	private bindingVariableName: string = ''

	init() {
		if (this.tree.template.isValueAtIndexMutable(this.valueIndex!)) {
			this.latestVariableName = this.tree.getUniqueLatestVariableName()
		}

		this.bindingVariableName = this.tree.getUniqueBindingVariableName()
	}

	outputInit() {
		let nodeName = this.tree.references.getReferenceName(this.node)

		// :class -> ClassBinding
		let bindingClassImport = imports.getImportByNameLike(this.name)
			|| imports.getImportByNameLike(this.name + 'Binding')!

		let bindingClassName = bindingClassImport.name.text
		let bindingClass = helper.symbol.resolveDeclaration(bindingClassImport, ts.isClassDeclaration)!
		let bindingClassConstructorParams = helper.cls.getConstructorParameters(bindingClass)
		let bindingParams: TS.Expression[] = [factory.createIdentifier(nodeName)]

		if (bindingClassConstructorParams.length > 1) {
			bindingParams.push(factory.createIdentifier(VariableNames.context))
		}

		if (bindingClassConstructorParams.length > 2) {
			bindingParams.push(factory.createArrayLiteralExpression(
				this.modifiers.map(m => factory.createStringLiteral(m)),
				false
			))
		}

		// new ClassBinding($node_0, ?$context, ?modifiers)
		return factory.createNewExpression(
			factory.createIdentifier(bindingClassName),
			undefined,
			bindingParams
		)
	}

	outputUpdate() {

		// $values[0], or "..."
		let value = this.getOutputValueNode()

		let callWith: {method: string, value: TS.Expression} = {method: 'update', value}

		if (this.name === 'class') {
			callWith = this.getClassUpdateCallWith(value)
		}
		else if (this.name === 'style') {
			callWith = this.getStyleUpdateCallWith(value)
		}

		// $latest_0 === $values[0] && $binding_0.update($latest_0 = $values[0])
		if (this.latestVariableName) {
			return factory.createBinaryExpression(
				factory.createBinaryExpression(
					factory.createIdentifier(this.latestVariableName),
					factory.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken),
					value
				),
				factory.createToken(ts.SyntaxKind.AmpersandAmpersandToken),
				factory.createCallExpression(
					factory.createPropertyAccessExpression(
						factory.createIdentifier(this.bindingVariableName),
						factory.createIdentifier('update')
					),
					undefined,
					[factory.createBinaryExpression(
						factory.createIdentifier(this.latestVariableName),
						factory.createToken(ts.SyntaxKind.EqualsToken),
						value
					)]
				)
			)
		}

		// $binding_0.update($values[0])
		else {
			return factory.createCallExpression(
					factory.createPropertyAccessExpression(
						factory.createIdentifier(this.bindingVariableName),
						factory.createIdentifier('update')
					),
					undefined,
					[value]
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

		if (this.valueIndex === null) {
			return {
				method: 'updateString',
				value,
			}
		}

		let slotNode = this.tree.template.slotNodes[this.valueIndex]
		let slotNodeType = helper.types.getType(slotNode)

		if (helper.types.isValueType(slotNodeType)) {
			return {
				method: 'updateString',
				value,
			}
		}
		else if (helper.types.isArrayType(slotNodeType)) {
			return {
				method: 'updateList',
				value,
			}
		}
		else if (helper.types.isObjectType(slotNodeType)) {
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
							factory.createStringLiteral("url("),
							factory.createToken(ts.SyntaxKind.PlusToken),
							value
						),
						factory.createToken(ts.SyntaxKind.PlusToken),
						factory.createStringLiteral(")")
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

				// `px`, `rem`, ...
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

		if (this.valueIndex === null) {
			return {
				method: 'updateString',
				value,
			}
		}

		let slotNode = this.tree.template.slotNodes[this.valueIndex]
		let slotNodeType = helper.types.getType(slotNode)

		if (helper.types.isValueType(slotNodeType)) {
			return {
				method: 'updateString',
				value,
			}
		}
		else if (helper.types.isObjectType(slotNodeType)) {
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
}