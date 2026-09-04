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

	testForRenderMethod() {
		return html`
			<lu:for ${n} of ${[1,2,3]}>
				${this.renderItem(n)}
			</lu:for>
		`
	}

	testForInlineBody() {
		return html`
			<lu:for ${n} of ${[1,2,3]}>
				${n + this.prop}
			</lu:for>
		`
	}

	testForIndex() {
		return html`
			<lu:for ${item, index} of ${this.items}>
				<div .title=${index}>${item.value}: ${index}</div>
			</lu:for>
		`
	}

	testForNestedIf() {
		return html`
			<lu:for ${item} of ${this.items}>
				<lu:if ${item.value > 0}>
					<lu:for ${value, index} of ${[item.value]}>
						${index}: ${value}
					</lu:for>
				</lu:if>
			</lu:for>
		`
	}

	testForLocalVariableTransferring() {
		let prop = this.prop

		return html`
			<lu:for ${n} of ${[1,2,3]}>
				${n + prop}
			</lu:for>
		`
	}

	testForTracking() {
		return html`
			<lu:for ${item} of ${this.items}>
				${item.value}
			</lu:for>
		`
	}

	testForMethodGetTracking() {
		return html`
			<lu:for ${item} of ${this.getItems()}>
				${item.value}
			</lu:for>
		`
	}

	testForVariableTracking() {
		let items = this.items

		return html`
			<lu:for ${item} of ${items}>
				${item.value}
			</lu:for>
		`
	}

	testReadonlyTracking() {
		return html`
			<lu:for ${item} of ${this.readonlyItems}>
				${item.value}
			</lu:for>
		`
	}

	testReadonlyVariableTracking() {
		let items = this.readonlyItems

		return html`
			<lu:for ${item} of ${items}>
				${item.value}
			</lu:for>
		`
	}

	testDeepReadonlyTracking() {
		return html`
			<lu:for ${item} of ${this.deepReadonlyItems}>
				${item.value}
			</lu:for>
		`
	}

	testDeepReadonlyVariableTracking() {
		let items = this.deepReadonlyItems

		return html`
			<lu:for ${item} of ${items}>
				${item.value}
			</lu:for>
		`
	}
}
