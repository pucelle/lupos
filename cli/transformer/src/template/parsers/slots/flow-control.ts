import type ts from 'typescript'
import {SlotParserBase} from './base'
import {AwaitFlowControl, FlowControlBase, ForFlowControl, IfFlowControl, KeyedFlowControl, SwitchFlowControl} from '../flow-control'
import {CacheFlowControl} from '../flow-control/cache'


type FlowControlConstructor = new (slot: FlowControlSlotParser) => FlowControlBase

/** Flow-control parser selected by its template tag. */
const FlowControlByTagName: Record<string, FlowControlConstructor> = {
	'lu:await': AwaitFlowControl,
	'lu:for': ForFlowControl,
	'lu:if': IfFlowControl,
	'lu:keyed': KeyedFlowControl,
	'lu:cache': CacheFlowControl,
	'lu:switch': SwitchFlowControl,
}


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
		let tagName = this.node.tagName!
		let Control = FlowControlByTagName[tagName]
		if (!Control) {
			throw new Error(`Unsupported flow-control tag '<${tagName}>'.`)
		}

		let control = new Control(this)
		this.control = control
		this.asLazyCallback = control.asLazyCallback
		control.preInit()
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
