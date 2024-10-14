import {SlotParserBase} from './base'
import {BindingBase, ClassBinding, RefBinding, StyleBinding} from '../bindings'


export class BindingSlotParser extends SlotParserBase {

	declare name: string
	declare modifiers: string[]

	/** To process output via binding type. */
	private binding!: BindingBase

	init() {
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

		binding.init()
		this.binding = binding
	}

	outputInit() {
		return this.binding.outputInit()
	}

	outputUpdate() {
		return this.binding.outputUpdate()
	}
}