import {Component, html} from '@pucelle/lupos.js'


class TestFor extends Component {

	prop: number = 1

	renderItem(n: number) {
		return html`${n + this.prop}`
	}

	testForMapFn() {
		return html`
			<lupos:for ${[1,2,3]}>${this.renderItem}</lupos:for>
		`
	}

	testForLocalMapFn() {
		return html`
			<lupos:for ${[1,2,3]}>${(n: number) => html`
				${n + this.prop}
			`}</lupos:for>
		`
	}

	testForLocalVariableTransferring() {
		let prop = this.prop

		return html`
			<lupos:for ${[1,2,3]}>${(n: number) => html`
				${n + prop}
			`}</lupos:for>
		`
	}
}
