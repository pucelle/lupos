import {Component, html, Binding, Part} from 'lupos.html'
import type {TemplateResult} from 'lupos.html'


export class TestCustomBinding extends Component {

	testCustom() {
		return html`<div :custom=${1} />`
	}

	testPartialCustom() {
		return html`<div ?:custom=${true, 1} />`
	}

	changeable: boolean = true
	templateResult!: TemplateResult

	testAlwaysChangeableParameter() {
		return html`<div :custom=${this.changeable, this.templateResult} />`
	}
}


class custom implements Part, Binding {

	afterConnectCallback() {
		
	}

    beforeDisconnectCallback() {
		
	}

	update(_value: any, _result?: TemplateResult) {}
}
