import {Component, html, ClassBinding} from '@pucelle/lupos.js'


class TestTemplateValues extends Component {

	prop: number = 1

	testStatic() {
		return html`<div class="${'className'}"></div>`
	}

	testMutable() {
		return html`<div class="${this.prop}"></div>`
	}

	testBundlingStringAndValues() {
		return html`<div class="name1 ${this.prop} name2 ${this.prop}"></div>`
	}

	testMergingSameValues() {
		return html`<div class="${this.prop}" :class=${this.prop}></div>`
	}
}
