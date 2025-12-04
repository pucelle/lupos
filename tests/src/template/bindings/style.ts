import {Component, html} from 'lupos.html'


export class TestStyleBinding extends Component {

	styleValue = 'red'
	numericValue = 1

	testInterpolatedString() {
		return html`<div :style="color: ${this.styleValue}" />`
	}

	testString() {
		return html`<div :style=${`color: ${this.styleValue}`} />`
	}

	testQuoted() {
		return html`<div :style="${this.numericValue}" />`
	}

	testObject() {
		return html`<div :style=${{color: this.styleValue}} />`
	}

	testModifier() {
		return html`<div :style.background-color=${this.styleValue} />`
	}

	testPxModifier() {
		return html`<div :style.width.px=${this.numericValue} />`
	}

	testPercentModifier() {
		return html`<div :style.width.percent=${this.numericValue} />`
	}

	testURLModifier() {
		return html`<div :style.background.url=${this.styleValue} />`
	}

	testConflictWithStyleAttr() {
		return html`<div style="background: ${this.styleValue}" :style.background=${this.styleValue} />`
	}
}


export class TestStaticStyleBinding extends Component {

	testInterpolatedString() {
		return html`<div :style="color: ${'red'}" />`
	}

	testString() {
		return html`<div :style=${'styleValue'} />`
	}

	testObject() {
		return html`<div :style=${{styleName: 'styleValue'}} />`
	}

	testModifier() {
		return html`<div :style.prop=${true} />`
	}
}