import type TS from 'typescript'
import {SlotParserBase} from './base'
import {AwaitFlowControl, FlowControlBase, ForFlowControl, IfFlowControl, KeyedFlowControl, SwitchFlowControl} from '../flow-control'


export class FlowControlSlotParser extends SlotParserBase {

	private control: FlowControlBase | null = null

	/** Flow control should always be updated dynamically. */
	isAnyValueOutputAsMutable(): boolean {
		return true
	}

	init() {
		let control: FlowControlBase

		switch (this.node.tagName) {
			case 'lu:await':
				control = new AwaitFlowControl(this)
				break

			case 'lu:for':
				control = new ForFlowControl(this)
				break

			case 'lu:if':
				control = new IfFlowControl(this)
				break

			case 'lu:keyed':
				control = new KeyedFlowControl(this)
				break

			case 'lu:switch':
				control = new SwitchFlowControl(this)
				break

			default:
				throw new Error(`Can't parse content:\n${this.node.toReadableString(this.template.values.valueNodes)}`)
		}

		control.init()
		this.control = control
	}

	outputInit(): TS.Statement | TS.Expression | (TS.Statement| TS.Expression)[] {
		return this.control!.outputInit()
	}

	outputUpdate(): TS.Statement | TS.Expression | (TS.Statement| TS.Expression)[] {
		return this.control!.outputUpdate()
	}
}