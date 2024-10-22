import {Component, html} from '@pucelle/lupos.js'


export class TestKeyed extends Component {

	key: number = 1

	testKeyed() {
		return html`
			<lu:keyed ${this.key}>Keyed Content</lu:keyed>
		`
	}
}
