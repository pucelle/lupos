import {Component, html, ClassBinding} from '@pucelle/lupos.js'


class TestText extends Component {

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

	testRestSlotContentWithPrecedingSlot() {
		return html`<ChildComponent>${this.prop}Rest Content</ChildComponent>`
	}
}
