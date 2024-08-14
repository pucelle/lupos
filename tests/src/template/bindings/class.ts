import {Component, html, ClassBinding} from '@pucelle/lupos.js'


class TestBinding extends Component {

	className = 'className'
	booleanValue = true

	testInterpolatedString() {
		return html`<div :class="${this.className} className2" />`
	}

	testString() {
		return html`<div :class=${this.className} />`
	}

	testArray() {
		return html`<div :class=${[this.className]} />`
	}

	testObject() {
		return html`<div :class=${{'className': this.booleanValue}} />`
	}

	testModifier() {
		return html`<div :class.prop=${this.booleanValue} />`
	}
}


class TestStaticClassBinding extends Component {

	testString() {
		return html`<div :class=${'className'} />`
	}

	testArray() {
		return html`<div :class=${['className']} />`
	}

	testObject() {
		return html`<div :class=${{'className': true}} />`
	}

	testModifier() {
		return html`<div :class.prop=${true} />`
	}
}