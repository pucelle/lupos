import {Component, html} from 'lupos.html'


export class TestAwait extends Component {

	promise = Promise.resolve(null) 

	testAwaitThen() {
		return html`
			<lu:await ${this.promise}>Pending Content</lu:await>
		`
	}

	testAwaitCatch() {
		return html`
			<lu:await ${this.promise}>Pending Content</lu:await>
		`
	}

	testAwaitThenCatch() {
		return html`
			<lu:await ${this.promise}>Pending Content</lu:await>
		`
	}
}
