import type TS from 'typescript'
import {SlotParserBase} from './base'
import {AwaitFlowControl, FlowControlBase, ForFlowControl, IfFlowControl, KeyedFlowControl, SwitchFlowControl} from '../flow-control'


export class FlowControlSlotParser extends SlotParserBase {

	private control!: FlowControlBase

	/** Flow control should always be updated dynamically. */
	isAnyValueOutputAsMutable(): boolean {
		return true
	}

	preInit() {
		let control: FlowControlBase | null = null

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
				console.error(`Can't parse content:\n${this.node.toReadableString(this.template.values.rawValueNodes)}`)
		}

		if (control) {
			control.preInit()
			this.control = control
		}
	}

	postInit() {
		this.control.postInit()
	}

	outputInit(): TS.Statement | TS.Expression | (TS.Statement| TS.Expression)[] {
		return this.control.outputInit()
	}

	outputUpdate(): TS.Statement | TS.Expression | (TS.Statement| TS.Expression)[] {
		return this.control.outputUpdate()
	}
}