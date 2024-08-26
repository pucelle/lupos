import {Component, html} from '@pucelle/lupos.js'


class TestContent extends Component {

	stringProp: string = '1'
	numericProp: number = 1
	booleanProp: boolean = true

	getStringProp() {
		return this.stringProp
	}

	testTemplateResultContent() {
		return html`<div>${html`<div></div>`}</div>`
	}

	testTemplateResultListContent() {
		return html`<div>${[html`<div></div>`]}</div>`
	}

	testTextContent() {
		return html`<div>${'abc'}</div>`
	}

	testStringContent() {
		return html`<div>${this.stringProp}</div>`
	}

	testStringMethodContent() {
		return html`<div>${this.getStringProp()}</div>`
	}

	testNumericContent() {
		return html`<div>${this.numericProp}</div>`
	}

	testMixedContent() {
		return html`<div>${this.booleanProp ? '1' : html`<div></div>`}</div>`
	}

	testMultipleContents() {
		return html`<div>${'1'} ${html`<div></div>`}</div>`
	}
}
