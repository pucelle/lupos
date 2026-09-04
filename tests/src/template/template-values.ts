import {Component, html} from 'lupos.html'
import {Observed} from '../../../web/out'


let globalVariable: number = 1


export class TestTemplateValues extends Component {

	prop: number = 1
	readonly readonlyProp: number = 1

	getValue() {
		return ''
	}

	getValues(): Observed<number[]> {
		return [1, 2]
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
		return html`<div .title=${this.getValue()}></div>`
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
			<lu:if ${this.prop}>
				<div ?hidden=${this.getValues().length === 0} />
			</lu:if>
		`
	}

	testCommonExpressionSyntax() {
		return html`
			<div
				data-arithmetic=${this.prop + 1}
				data-conditional=${this.prop > 0 ? this.prop : 0}
				data-optional=${this.getValues()?.[0] ?? this.prop}
				data-array=${[this.prop, ...this.getValues()]}
				data-object=${{value: this.prop}}
				data-template=${`value-${this.prop}`}
				data-satisfies=${this.prop satisfies number}
			></div>
		`
	}
}
