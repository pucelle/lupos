import {Component, html} from 'lupos.html'
import {Observed} from '../../../web/out'


let globalVariable: number = 1


export class TestTemplateValues extends Component {

	prop: number = 1
	readonly readonlyProp: number = 1

	getValue() {
		return ''
	}

	handleEvent(_value: any) {}

	getValues(): Observed<number[]> {
		return [1, 2]
	}

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

	testMutableOfBoundMethod() {
		return html`<div @click=${this.handleEvent.bind(this)}></div>`
	}

	testMutableOfGlobalVariables() {
		return html`<div @click=${() => this.handleEvent(Math.PI)}></div>`
	}

	testBundlingStringAndValues() {
		return html`<div attr="name1 ${this.prop} name2 ${this.prop}"></div>`
	}

	testMergingSameValues() {
		return html`<div attr="${this.prop}" attr2=${this.prop}></div>`
	}

	testMergingSameReferencedValues() {
		return html`
			${this.getValues().map(value => html`<span>${value}</span>`)}
			<lu:if ${this.prop}>
				<div ?hidden=${this.getValues().length === 0} />
			</lu:if>
		`
	}
}
