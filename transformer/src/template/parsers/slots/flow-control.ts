import type * as ts from 'typescript'
import {SlotParserBase} from './base'
import {AwaitFlowControl, FlowControlBase, ForFlowControl, IfFlowControl, KeyedFlowControl, SwitchFlowControl} from '../flow-control'


export class FlowControlSlotParser extends SlotParserBase {

	private control!: FlowControlBase

	/** Flow control should always be updated dynamically. */
	isAnyValueOutputted(): boolean {
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
		}

		if (control) {
			control.preInit()
			this.control = control
		}
	}

	postInit() {
		this.control.postInit()
	}

	outputInit(): ts.Statement | ts.Expression | (ts.Statement| ts.Expression)[] {
		return this.control.outputInit()
	}

	outputUpdate(): ts.Statement | ts.Expression | (ts.Statement| ts.Expression)[] {
		return this.control.outputUpdate()
	}
}