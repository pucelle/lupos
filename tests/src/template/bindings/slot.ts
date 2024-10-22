import {Component, html} from '@pucelle/lupos.js'


export class TestSlotBinding extends Component {

	testSlot() {
		return html`<div :slot="slotName" />`
	}
}
