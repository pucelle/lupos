import ts = require('typescript')
import {Packer, transformContext} from '../../../core'
import {BindingBase, BindingUpdateCallWith} from './base'


export class StyleBinding extends BindingBase {
	
	protected override patchCallMethodAndValues(callWith: BindingUpdateCallWith): BindingUpdateCallWith {
		let value = callWith.values[0]

		if (this.modifiers.length > 0) {
			if (this.modifiers.length > 1 && this.modifiers[1].length > 0) {

				// `.url` -> `url(...)`
				if (this.modifiers[1] === 'url') {
					value = transformContext.factory.createBinaryExpression(
						transformContext.factory.createBinaryExpression(
							transformContext.factory.createStringLiteral('url('),
							transformContext.factory.createToken(ts.SyntaxKind.PlusToken),
							value
						),
						transformContext.factory.createToken(ts.SyntaxKind.PlusToken),
						transformContext.factory.createStringLiteral(')')
					)
				}

				// `.percent`
				else if (this.modifiers[1] === 'percent') {
					value = transformContext.factory.createBinaryExpression(
						value,
						transformContext.factory.createToken(ts.SyntaxKind.PlusToken),
						transformContext.factory.createStringLiteral('%')
					)
				}

				// `.px`, `.rem`, ...
				else if (/^\w+$/.test(this.modifiers[1])) {
					value = transformContext.factory.createBinaryExpression(
						value,
						transformContext.factory.createToken(ts.SyntaxKind.PlusToken),
						transformContext.factory.createStringLiteral(this.modifiers[1])
					)
				}
			}

			return {
				method: 'updateObject',
				values: [transformContext.factory.createObjectLiteralExpression(
					[transformContext.factory.createPropertyAssignment(
						Packer.createPropertyName(this.modifiers[0]),
						value
					)],
					false
				)],
			}
		}

		if (!this.slot.hasValueIndex()) {
			return {
				method: 'updateString',
				values: [value],
			}
		}

		let slotNode = this.slot.getFirstRawValueNode()
		let slotNodeType = slotNode ? transformContext.helper.types.typeOf(slotNode) : null

		if (this.slot.hasString() || transformContext.helper.types.isValueType(slotNodeType!)) {
			return {
				method: 'updateString',
				values: [value],
			}
		}
		else if (transformContext.helper.types.isObjectType(slotNodeType!)) {
			return {
				method: 'updateObject',
				values: [value],
			}
		}

		return callWith
	}
}