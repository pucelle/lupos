import type TS from 'typescript'
import {SlotParserBase} from './base'
import {AwaitFlowControl, FlowControlBase, ForFlowControl, IfFlowControl, KeyedFlowControl, SwitchFlowControl} from '../flow-control'


export class FlowControlSlotParser extends SlotParserBase {

	private control: FlowControlBase | null = null

	init() {
		let control: FlowControlBase

		switch (this.node.tagName) {
			case 'lupos:await':
				control = new AwaitFlowControl(this)
				break

			case 'lupos:for':
				control = new ForFlowControl(this)
				break

			case 'lupos:if':
				control = new IfFlowControl(this)
				break

			case 'lupos:keyed':
				control = new KeyedFlowControl(this)
				break

			case 'lupos:switch':
				control = new SwitchFlowControl(this)
				break

			default:
				throw new Error(`${this.node.toReadableString()} can't be parsed!`)
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