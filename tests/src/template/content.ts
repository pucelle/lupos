import {Component, html} from '@pucelle/lupos.js'


class TestContent extends Component {

	prop: number = 1

	testTemplateResult() {
		return html`<div>${html`<div></div>`}</div>`
	}

	// testTemplateResultList() {
	// 	return html`<div>${[html`<div></div>`]}</div>`
	// }
}
