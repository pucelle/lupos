import {Component, html} from '@pucelle/lupos.js'


let globalVariable: number = 1


export class TestTemplateValues extends Component {

	prop: number = 1
	readonly readonlyProp: number = 1

	getValue() {
		return ''
	}

	handleEvent(_value: any) {}

	testStatic() {
		return html`<div attr="${'className'}"></div>`
	}

	testMutable() {
		return html`<div attr=${this.prop}></div>`
	}

	testMutableOfReadonlyProp() {
		return html`<div attr=${this.readonlyProp}></div>`
	}

	testMutableOfMethod() {
		return html`<div .prop=${this.getValue}></div>`
	}

	testMutableOfCallingMethod() {
		return html`<div attr=${this.getValue()}></div>`
	}

	testMutableOfReferencingProperty() {
		return html`<div @click=${() => this.handleEvent(this.prop)} />`
	}

	testMutableOfReferencingTopmostVariable() {
		return html`<div @click=${() => this.handleEvent(globalVariable)} />`
	}

	testBundlingStringAndValues() {
		return html`<div attr="name1 ${this.prop} name2 ${this.prop}"></div>`
	}

	testMergingSameValues() {
		return html`<div attr="${this.prop}" attr2=${this.prop}></div>`
	}
}
