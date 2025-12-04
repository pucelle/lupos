import {Component, html} from 'lupos.html'


export class TestPortal extends Component {


	testPortal() {
		return html`
			<lu:portal><div>Portal Content</div></lu:portal>
		`
	}
}
