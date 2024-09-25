import {Component, html} from '@pucelle/lupos.js'


class TestFor extends Component {

	prop: number = 1

	renderItem(n: number) {
		return html`${n + this.prop}`
	}

	testForMapFn() {
		return html`
			<lu:for ${[1,2,3]}>${this.renderItem}</lu:for>
		`
	}

	testForLocalMapFn() {
		return html`
			<lu:for ${[1,2,3]}>${(n: number) => html`
				${n + this.prop}
			`}</lu:for>
		`
	}

	testForLocalVariableTransferring() {
		let prop = this.prop

		return html`
			<lu:for ${[1,2,3]}>${(n: number) => html`
				${n + prop}
			`}</lu:for>
		`
	}
}
