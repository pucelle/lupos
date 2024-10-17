import {SlotParserBase} from './base'
import {BindingBase, ClassBinding, RefBinding, StyleBinding} from '../bindings'


export class BindingSlotParser extends SlotParserBase {

	declare name: string
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

		binding.preInit()
		this.binding = binding
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