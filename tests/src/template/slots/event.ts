import {Component, html} from '@pucelle/lupos.js'


export class TestEvent extends Component {

	UnionedCom: typeof Com1 | typeof Com2 = Com1
	ConstructedCom: ComConstructor = Com1
	booleanValue: boolean = true

	handleEvent() {}
	handleEventWithParameter(_value: boolean) {}
	handleAnotherEvent() {}

	testComponentEvent() {
		return html`<Com1 @connected=${this.handleEvent} />`
	}

	testMoreComponentEvent() {
		return html`<Com1 @eventName=${this.handleEvent} />`
	}

	testExtendedComponentEvent() {
		return html`<Com2 @eventName=${this.handleEvent} />`
	}

	testUnionedDynamicComponentEvent() {
		return html`<${this.UnionedCom} @connected=${this.handleEvent} />`
	}

	testConstructedDynamicComponentEvent() {
		return html`<${this.ConstructedCom} @connected=${this.handleEvent} />`
	}

	testForceComponentEvent() {
		return html`<Com1 @@eventName=${this.handleEvent} />`
	}

	testElementEvent() {
		return html`<div @click=${this.handleEvent} />`
	}

	testEventModifier() {
		return html`<div @click.prevent=${this.handleEvent} />`
	}

	testDynamicEventHandler() {
		return html`<div @click=${this.booleanValue ? this.handleEvent : this.handleAnotherEvent} />`
	}

	testInlineEventHandler() {
		return html`<div @click=${() => {this.booleanValue = true}} />`
	}

	testInlineCallMethod() {
		return html`<div @click=${() => this.handleEventWithParameter(this.booleanValue)} />`
	}

	testLocalReference() {
		let value: any = 1
		return html`<div @click=${() => value} />`
	}

	testLocalAssignment() {
		let value: any
		value
		return html`<div @click=${(e: any) => value = e} />`
	}

	testIgnoringBound() {
		return html`<div @click=${this.handleEvent.bind(this)} />`
	}
}


interface ComEvents {
	eventName: () => void
}

class Com1 extends Component<ComEvents> {}
class Com2 extends Com1 {}

interface ComConstructor {
	new(): Com1 | Com2
}