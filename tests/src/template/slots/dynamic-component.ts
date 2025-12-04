import {Component, html} from 'lupos.html'


export class TestDynamicComponent extends Component {

	prop: number = 1

	// testNormal() {
	// 	return html`<${ChildComponent} />`
	// }

	// testChildContent() {
	// 	return html`<${ChildComponent}>Content</>`
	// }

	// testChildContentReference() {
	// 	return html`<${ChildComponent} :class=${'className'}><div :class=${'className'} /></>`
	// }

	// testStaticBinding() {
	// 	return html`<${ChildComponent} :class=${'className'} />`
	// }

	testDynamicProp() {
		return html`<${ChildComponent} .comProp=${this.prop} />`
	}
}

class ChildComponent extends Component {

	comProp!: number
}
