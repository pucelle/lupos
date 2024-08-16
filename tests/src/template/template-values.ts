import {Component, html} from '@pucelle/lupos.js'


class TestTemplateValues extends Component {

	prop: number = 1
	readonly readonlyProp: number = 1

	testStatic() {
		return html`<div attr="${'className'}"></div>`
	}

	testMutable() {
		return html`<div attr=${this.prop}></div>`
	}

	testReadonlyPropMutable() {
		return html`<div attr=${this.readonlyProp}></div>`
	}

	testMethodMutable() {
		return html`<div .prop=${this.getValue}></div>`
	}

	testMethodCallingMutable() {
		return html`<div attr=${this.getValue()}></div>`
	}

	getValue() {
		return ''
	}

	testBundlingStringAndValues() {
		return html`<div attr="name1 ${this.prop} name2 ${this.prop}"></div>`
	}

	testMergingSameValues() {
		return html`<div attr="${this.prop}" attr2=${this.prop}></div>`
	}
}
