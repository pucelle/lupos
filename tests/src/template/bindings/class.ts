import {Component, html} from '@pucelle/lupos.js'


class TestClassBinding extends Component {

	className = 'className'
	booleanValue = true

	testClassString() {
		return html`<div :class=${this.className} />`
	}

	testClassArray() {
		return html`<div :class=${[this.className]} />`
	}

	testClassObject() {
		return html`<div :class=${{'className': this.booleanValue}} />`
	}

	testClassModifier() {
		return html`<div :class.prop=${this.booleanValue} />`
	}
}


class TestStaticClassBinding extends Component {

	testClassString() {
		return html`<div :class=${'className'} />`
	}

	testClassArray() {
		return html`<div :class=${['className']} />`
	}

	testClassObject() {
		return html`<div :class=${{'className': true}} />`
	}

	testClassModifier() {
		return html`<div :class.prop=${true} />`
	}
}