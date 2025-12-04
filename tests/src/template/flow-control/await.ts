import {Component, html} from 'lupos.html'


export class TestAwait extends Component {

	promise = Promise.resolve() 

	testAwaitThen() {
		return html`
			<lu:await ${this.promise}>Pending Content</lu:await>
			<lu:then>Then Content</lu:then>
		`
	}

	testAwaitCatch() {
		return html`
			<lu:await ${this.promise}>Pending Content</lu:await>
			<lu:catch>Catch Content</lu:catch>
		`
	}

	testAwaitThenCatch() {
		return html`
			<lu:await ${this.promise}>Pending Content</lu:await>
			<lu:then>Then Content</lu:then>
			<lu:catch>Catch Content</lu:catch>
		`
	}
}
