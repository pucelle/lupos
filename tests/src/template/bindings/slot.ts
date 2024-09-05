import {Component, html} from '@pucelle/lupos.js'


class TestSlotBinding extends Component {

	testSlot() {
		return html`<div :slot="slotName" />`
	}
}
