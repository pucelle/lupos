import {Component, html} from 'lupos.html'


export class TestKeyed extends Component {

	key: number = 1

	testKeyed() {
		return html`
			<lu:keyed ${this.key}>Keyed Content</lu:keyed>
		`
	}
}
