import type * as ts from 'typescript'
import {SlotParserBase} from './base'
import {AwaitFlowControl, FlowControlBase, ForFlowControl, IfFlowControl, KeyedFlowControl, SwitchFlowControl} from '../flow-control'
import {CacheFlowControl} from '../flow-control/cache'


export class FlowControlSlotParser extends SlotParserBase {

	private control!: FlowControlBase

	/** 
	 * Flow control should always be updated dynamically,
	 * Or it's meaningless to use a flow.
	 */
	override shouldUpdateDynamically(): boolean {
		return true
	}

	override preInit() {
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

			case 'lu:cache':
				control = new CacheFlowControl(this)
				break

			case 'lu:switch':
				control = new SwitchFlowControl(this)
				break
		}

		if (control) {
			this.control = control
			this.asLazyCallback = control.asLazyCallback
			control.preInit()
		}
	}

	override postInit() {
		this.control.postInit()
	}

	override outputInit(): ts.Statement | ts.Expression | (ts.Statement| ts.Expression)[] {
		return this.control.outputInit()
	}

	override outputUpdate(): ts.Statement | ts.Expression | (ts.Statement| ts.Expression)[] {
		return this.control.outputUpdate()
	}
}