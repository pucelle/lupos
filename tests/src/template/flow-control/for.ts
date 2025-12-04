import {Observed} from '../../../../web/out'
import {Component, html} from 'lupos.html'


export class TestFor extends Component {

	prop: number = 1
	items: {value: number}[] = [{value: 1}]
	readonly readonlyItems: {value: number}[] = [{value: 1}]
	readonly deepReadonlyItems: ReadonlyArray<{value: number}> = [{value: 1}]

	getItems(): Observed<{value: number}[]> {
		return this.items
	}

	renderItem(n: number) {
		return html`${n + this.prop}`
	}

	testForMapFn() {
		return html`
			<lu:for ${[1,2,3]}>
				${this.renderItem}
			</lu:for>
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

	testForMethodGetTracking() {
		return html`
			<lu:for ${this.getItems()}>${(item: {value: number}) => html`
				${item.value}
			`}</lu:for>
		`
	}

	testForVariableTracking() {
		let items = this.items

		return html`
			<lu:for ${items}>${(item: {value: number}) => html`
				${item.value}
			`}</lu:for>
		`
	}

	testReadonlyTracking() {
		return html`
			<lu:for ${this.readonlyItems}>${(item: {value: number}) => html`
				${item.value}
			`}</lu:for>
		`
	}

	testReadonlyVariableTracking() {
		let items = this.readonlyItems

		return html`
			<lu:for ${items}>${(item: {value: number}) => html`
				${item.value}
			`}</lu:for>
		`
	}

	testDeepReadonlyTracking() {
		return html`
			<lu:for ${this.deepReadonlyItems}>${(item: {value: number}) => html`
				${item.value}
			`}</lu:for>
		`
	}

	testDeepReadonlyVariableTracking() {
		let items = this.deepReadonlyItems

		return html`
			<lu:for ${items}>${(item: {value: number}) => html`
				${item.value}
			`}</lu:for>
		`
	}
}
