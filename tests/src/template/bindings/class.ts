import {Component, html} from '@pucelle/lupos.js'


class TestClassBinding extends Component {

	className = 'className'
	booleanValue = true

	testInterpolatedString() {
		return html`<div :class="${this.className} className2" />`
	}

	testString() {
		return html`<div :class=${this.className} />`
	}

	testQuoted() {
		return html`<div :class="${this.booleanValue}" />`
	}

	testList() {
		return html`<div :class=${[this.className]} />`
	}

	testObject() {
		return html`<div :class=${{'className': this.booleanValue}} />`
	}

	testModifier() {
		return html`<div :class.className=${this.booleanValue} />`
	}

	testConflictWithClassAttr() {
		return html`<div class=${this.className} :class.className=${this.booleanValue} />`
	}
}


class TestStaticClassBinding extends Component {

	testInterpolatedString() {
		return html`<div :class="${'className'} className2" />`
	}

	testString() {
		return html`<div :class=${'className'} />`
	}

	testList() {
		return html`<div :class=${['className']} />`
	}

	testObject() {
		return html`<div :class=${{'className': true}} />`
	}

	testModifier() {
		return html`<div :class.className=${true} />`
	}
}