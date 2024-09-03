import {Component, html} from '@pucelle/lupos.js'


class TestContent extends Component {

	stringProp: string = '1'
	numericProp: number = 1
	booleanProp: boolean = true

	testTemplateResultContent() {
		return html`<div>${html`<div></div>`}</div>`
	}

	testTemplateResultListContent() {
		return html`<div>${[html`<div></div>`]}</div>`
	}

	testMixedContent() {
		return html`<div>${this.booleanProp ? '1' : html`<div></div>`}</div>`
	}

	testMultipleContents() {
		return html`<div> ${'1'} ${html`<div></div>`} ${'1'}</div>`
	}
}
