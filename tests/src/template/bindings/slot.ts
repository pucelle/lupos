import {Component, html} from 'lupos.html'


export class TestSlotBinding extends Component {

	testSlot() {
		return html`<div :slot="slotName" />`
	}
}
