import {Component, html} from '@pucelle/lupos.js'


class TestAwait extends Component {

	promise = Promise.resolve() 

	testAwaitThen() {
		return html`
			<lupos:await ${this.promise}>Pending Content</lupos:await>
			<lupos:then>Then Content</lupos:then>
		`
	}

	testAwaitCatch() {
		return html`
			<lupos:await ${this.promise}>Pending Content</lupos:await>
			<lupos:catch>Catch Content</lupos:catch>
		`
	}

	testAwaitThenCatch() {
		return html`
			<lupos:await ${this.promise}>Pending Content</lupos:await>
			<lupos:then>Then Content</lupos:then>
			<lupos:catch>Catch Content</lupos:catch>
		`
	}
}
