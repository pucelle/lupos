import {Component, html} from '@pucelle/lupos.js'


export class TestText extends Component {

	stringProp: string = '1'
	numericProp: number = 1

	getStringProp() {
		return this.stringProp
	}

	testStaticText() {
		return html`<div>${'abc'}</div>`
	}

	testStringProp() {
		return html`<div>${this.stringProp}</div>`
	}

	testStringMethod() {
		return html`<div>${this.getStringProp()}</div>`
	}

	testNumericProp() {
		return html`<div>${this.numericProp}</div>`
	}
}
