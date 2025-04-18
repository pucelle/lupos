import {SlotParserBase} from './base'
import {BindingBase, ClassBinding, RefBinding, StyleBinding} from '../bindings'
import {HTMLAttribute} from '../../../lupos-ts-module'


export class BindingSlotParser extends SlotParserBase {

	declare attr: HTMLAttribute
	declare name: string
	declare prefix: string
	declare modifiers: string[]

	/** To process output via binding type. */
	private binding!: BindingBase

	preInit() {
		let binding: BindingBase

		switch (this.name) {
			case 'ref':
				binding = new RefBinding(this)
				break

			case 'class':
				binding = new ClassBinding(this)
				break

			case 'style':
				binding = new StyleBinding(this)
				break

			default:
				binding = new BindingBase(this)
		}

		this.asLazyCallback = binding.asLazyCallback
		this.binding = binding
		binding.preInit()
	}

	postInit() {
		this.binding.postInit()
	}

	outputInit() {
		return this.binding.outputInit()
	}

	outputUpdate() {
		return this.binding.outputUpdate()
	}
}