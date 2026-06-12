import {Component, html} from 'lupos.html'


export class TestCache extends Component {

	testCache() {
		return html`
			<lu:cache>${this.renderCacheContent()}</lu:cache>
		`
	}

	private renderCacheContent() {
		return html`Keyed Content`
	}
}
