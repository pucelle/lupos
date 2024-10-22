import {Component, html} from '@pucelle/lupos.js'


export class TestPortal extends Component {


	testPortal() {
		return html`
			<lu:portal><div>Portal Content</div></lu:portal>
		`
	}
}
