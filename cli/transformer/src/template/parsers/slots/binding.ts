import {SlotParserBase} from './base'
import {BindingBase, ClassBinding, RefBinding, StyleBinding} from '../bindings'
import {HTMLAttribute} from '../../../lupos-ts-module'


type BindingConstructor = new (slot: BindingSlotParser) => BindingBase

/** Specialized binding parsers, falling back to the custom binding parser. */
const BindingByName: Record<string, BindingConstructor> = {
	ref: RefBinding,
	class: ClassBinding,
	style: StyleBinding,
}


export class BindingSlotParser extends SlotParserBase {

	declare attr: HTMLAttribute
	declare name: string
	declare prefix: string
	declare modifiers: string[]

	/** To process output via binding type. */
	private binding!: BindingBase

	override preInit() {
		let Binding = BindingByName[this.name] ?? BindingBase
		let binding = new Binding(this)

		this.asLazyCallback = binding.asLazyCallback
		this.binding = binding
		binding.preInit()
	}

	override postInit() {
		this.binding.postInit()
	}

	override outputInit() {
		return this.binding.outputInit()
	}

	override outputUpdate() {
		return this.binding.outputUpdate()
	}
}
