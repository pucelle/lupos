import {Component, html} from '@pucelle/lupos.js'


class TestKeyed extends Component {

	key: number = 1

	testKeyed() {
		return html`
			<lupos:keyed ${this.key}>Keyed Content</lupos:keyed>
		`
	}
}
