import {Component, html} from 'lupos.html'


export class TestComponent extends Component {

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
		return html`<ChildComponent>${html`<div />`}Rest Content</ChildComponent>`
	}

	testTagNameDeclare() {
		return html`<ChildComponentWithTagName />`
	}

	testTagNameAttr() {
		return html`<ChildComponentWithTagName tagName="pre" />`
	}
}

class ChildComponent extends Component {

	prop!: number
}

class ChildComponentWithTagName extends Component {
	declare static tagName: 'slot'
	prop!: number
}
