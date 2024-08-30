import {Component, html, ClassBinding} from '@pucelle/lupos.js'


class TestDynamicComponent extends Component {

	prop: number = 1

	testNormal() {
		return html`<${ChildComponent} />`
	}

	testChildContent() {
		return html`<${ChildComponent}>Content</>`
	}

	testStaticBinding() {
		return html`<${ChildComponent} :class=${'className'} />`
	}

	testDynamicProp() {
		return html`<${ChildComponent} .prop=${this.prop} />`
	}
}

class ChildComponent extends Component {

	prop!: number
}
