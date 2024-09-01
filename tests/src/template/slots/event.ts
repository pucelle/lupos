import {Component, html} from '@pucelle/lupos.js'


class TestEvent extends Component {

	UnionedCom: typeof Com1 | typeof Com2 = Com1
	ConstructedCom: ComConstructor = Com1

	handleEvent() {}

	testComponentEvent() {
		return html`<Com1 @connected=${this.handleEvent} />`
	}

	testMoreComponentEvent() {
		return html`<Com1 @eventName=${this.handleEvent} />`
	}

	testUnionedDynamicComponentEvent() {
		return html`<${this.UnionedCom} @connected=${this.handleEvent} />`
	}

	testConstructedDynamicComponentEvent() {
		return html`<${this.ConstructedCom} @connected=${this.handleEvent} />`
	}

	testForceComponentEvent() {
		return html`<Com1 @@forceComEvent=${this.handleEvent} />`
	}

	testElementEvent() {
		return html`<div @click=${this.handleEvent} />`
	}

	testSimulatedTapEvent() {
		return html`<div @tap=${this.handleEvent} />`
	}

	testSimulatedHoldStartEvent() {
		return html`<div @hold:start=${this.handleEvent} />`
	}

	testEventModifying() {
		return html`<div @click.prevent=${this.handleEvent} />`
	}
}


interface ComEvents {
	eventName: () => void
}

class Com1 extends Component<ComEvents> {}
class Com2 extends Component {}

interface ComConstructor {
	new(args: any[]): Com1 | Com2
}