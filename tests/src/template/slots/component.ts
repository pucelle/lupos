import {Component, html} from '@pucelle/lupos.js'


class TestComponent extends Component {

	prop: number = 1

	testComponent() {
		return html`<ChildComponent
			:class=${'className'}
			.prop=${this.prop}
		/>`
	}

	testRestSlotContent() {
		return html`<ChildComponent>Rest Content</ChildComponent>`
	}

	testRestSlotContentWithPrecedingTemplateSlot() {
		return html`<ChildComponent>${this.prop}Rest Content</ChildComponent>`
	}
}

class ChildComponent extends Component {

	prop!: number
}
