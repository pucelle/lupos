import {Component, html} from '@pucelle/lupos.js'


class TestAttribute extends Component {

	className = 'className'
	booleanValue = true
	nullableClassName!: string | null

	testInterpolatedString() {
		return html`<div class="${this.className} className2" />`
	}

	testString() {
		return html`<div class=${this.className} />`
	}

	testNullableAttr() {
		return html`<div class=${this.nullableClassName} />`
	}
}
