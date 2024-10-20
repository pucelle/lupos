import {factory, Helper} from '../../../base'
import {BindingBase, BindingUpdateCallWith} from './base'


export class ClassBinding extends BindingBase {
	
	protected patchCallMethodAndValues(callWith: BindingUpdateCallWith): BindingUpdateCallWith {
		let value = callWith.values[0]

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

		return callWith
	}
}