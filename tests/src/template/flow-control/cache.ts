import {Component, html} from 'lupos.html'


export class TestCache extends Component {

	testCache() {
		return html`
			<lu:cache>Keyed Content</lu:cache>
		`
	}
}
