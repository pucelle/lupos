import {Component, html, Binding, Part} from 'lupos.html'


export class TestCustomBinding extends Component {

	testCustom() {
		return html`<div :custom=${1} />`
	}

	testPartialCustom() {
		return html`<div ?:custom=${true, 1} />`
	}
}


class custom implements Part, Binding {

	afterConnectCallback() {
		
	}

    beforeDisconnectCallback() {
		
	}

	update(_value: any) {}
}