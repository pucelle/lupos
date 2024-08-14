import {Component, html, StyleBinding} from '@pucelle/lupos.js'


class TestStyleBinding extends Component {

	styleValue = 'red'
	numericValue = 1

	testInterpolatedString() {
		return html`<div :style="color: ${this.styleValue}" />`
	}

	testWholeString() {
		return html`<div :style=${`color: ${this.styleValue}`} />`
	}

	testObject() {
		return html`<div :style=${{color: this.styleValue}} />`
	}

	testModifier() {
		return html`<div :style.color=${this.styleValue} />`
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
}


class TestStaticStyleBinding extends Component {

	testString() {
		return html`<div :style=${'className'} />`
	}

	testObject() {
		return html`<div :style=${{'className': true}} />`
	}

	testModifier() {
		return html`<div :style.prop=${true} />`
	}
}