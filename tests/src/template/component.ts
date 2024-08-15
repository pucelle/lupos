import {Component, html} from '@pucelle/lupos.js'


class TestComponent extends Component {

	testComponent() {
		return html`<ChildComponent .prop=${'1'} />`
	}

	testString() {
		return html`<ChildComponent />`
	}
}

class ChildComponent extends Component {

	prop: string
}
