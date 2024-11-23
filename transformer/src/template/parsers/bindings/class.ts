import {factory, Packer, helper} from '../../../core'
import {BindingBase, BindingUpdateCallWith} from './base'


export class ClassBinding extends BindingBase {
	
	protected patchCallMethodAndValues(callWith: BindingUpdateCallWith): BindingUpdateCallWith {
		let value = callWith.values[0]

		if (this.modifiers.length > 0) {
			return {
				method: 'updateObject',
				values: [factory.createObjectLiteralExpression(
					[factory.createPropertyAssignment(
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
		let slotNodeType = slotNode ? helper.types.typeOf(slotNode) : null

		if (this.slot.hasString() || helper.types.isValueType(slotNodeType!)) {
			return {
				method: 'updateString',
				values: [value],
			}
		}
		else if (helper.types.isArrayType(slotNodeType!)) {
			return {
				method: 'updateList',
				values: [value],
			}
		}
		else if (helper.types.isObjectType(slotNodeType!)) {
			return {
				method: 'updateObject',
				values: [value],
			}
		}

		return callWith
	}
}