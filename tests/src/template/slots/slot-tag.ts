import {Component, html} from 'lupos.html'


export class TestComponent extends Component {

	prop: number = 1

	testRestSlot() {
		return html`<div><slot /></div>`
	}

	testRestSlotWithContent() {
		return html`<ChildCom><div>Content</div></>`
	}
}

class ChildCom extends Component {
	render() {
		return html`
			<slot />
		`
	}
}