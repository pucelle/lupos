import {Component, html} from 'lupos.html'


export class TestProperty extends Component {

	UnionedCom: typeof Com1 | typeof Com2 = Com1
	ConstructedCom: ComConstructor = Com1

	testComponentProperty() {
		return html`<Com1 .comProp=${1} />`
	}

	testUnionedDynamicComponentProperty() {
		return html`<${this.UnionedCom} .comProp=${1} />`
	}

	testConstructedDynamicComponentProperty() {
		return html`<${this.ConstructedCom} .comProp=${1} />`
	}

	testForceComponentProperty() {
		return html`<Com1 ..comProp=${1} />`
	}

	testInterfaceMixinComponentProperty() {
		return html`<Com3 .comProp=${1} />`
	}

	testElementProperty() {
		return html`<div .elProp=${1} />`
	}
}


class Com1 extends Component {
	comProp: number = 1
}

class Com2 extends Component {
	comProp: number = 1
}

class Com3 extends Component {}
interface Com3 extends Com1{}

interface ComConstructor {
	new(): Com1 | Com2
}