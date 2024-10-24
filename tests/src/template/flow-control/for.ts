import {Component, html} from '@pucelle/lupos.js'


export class TestFor extends Component {

	prop: number = 1
	items: {value: number}[] = [{value: 1}]

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

	testForTracking() {
		return html`
			<lu:for ${this.items}>${(item: {value: number}) => html`
				${item.value}
			`}</lu:for>
		`
	}
}
