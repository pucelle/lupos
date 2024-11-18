import {factory, Helper, ts} from '../../../core'
import {BindingBase, BindingUpdateCallWith} from './base'


export class StyleBinding extends BindingBase {
	
	protected patchCallMethodAndValues(callWith: BindingUpdateCallWith): BindingUpdateCallWith {
		let value = callWith.values[0]

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

		if (!this.slot.hasValueIndex()) {
			return {
				method: 'updateString',
				values: [value],
			}
		}

		let slotNode = this.slot.getFirstRawValueNode()
		let slotNodeType = slotNode ? Helper.types.typeOf(slotNode) : null

		if (this.slot.hasString() || Helper.types.isValueType(slotNodeType!)) {
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

		return callWith
	}
}