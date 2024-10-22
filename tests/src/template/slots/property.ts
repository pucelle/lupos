import {Component, html} from '@pucelle/lupos.js'


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
		return html`<Com1 ..forceComProp=${1} />`
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

interface ComConstructor {
	new(args: any[]): Com1 | Com2
}