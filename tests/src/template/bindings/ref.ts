import {ClassBinding, Component, html} from '@pucelle/lupos.js'


class TestRefBinding extends Component {

	refEl: any
	refCom: any
	refElByType!: HTMLElement
	refBinding!: ClassBinding

	testRefEl() {
		return html`<div :ref=${this.refEl} />`
	}

	testRefCom() {
		return html`<ChildComponent :ref=${this.refCom} />`
	}

	testRefElModifier() {
		return html`<ChildComponent :ref.el=${this.refEl} />`
	}

	testRefElByDeclarationType() {
		return html`<ChildComponent :ref=${this.refElByType} />`
	}

	testRefBinding() {
		return html`<ChildComponent :class="className" :ref.binding=${this.refBinding} />`
	}
}

class ChildComponent extends Component {}
