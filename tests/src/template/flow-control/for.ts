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

	renderItemWithIndex(n: number, index: number) {
		return html`${n + index + this.prop}`
	}

	testForRenderer() {
		return html`
			<lu:for ${[1,2,3]}>
				${this.renderItem}
			</lu:for>
		`
	}

	testForRendererWithParameter() {
		return html`
			<lu:for ${[1,2,3]}>
				${(n) => this.renderItem(n)}
			</lu:for>
		`
	}

	testForRendererWithParameters() {
		return html`
			<lu:for ${[1,2,3]}>
				${(n, index) => this.renderItemWithIndex(n, index)}
			</lu:for>
		`
	}

	testForOfRenderMethod() {
		return html`
			<lu:for ${n} of ${[1,2,3]}>
				${this.renderItem(n)}
			</lu:for>
		`
	}

	testForOfInlineBody() {
		return html`
			<lu:for ${n} of ${[1,2,3]}>
				${n + this.prop}
			</lu:for>
		`
	}

	testForOfIndex() {
		return html`
			<lu:for ${item, index} of ${this.items}>
				<div .title=${index + ''}>${item.value}: ${index}</div>
			</lu:for>
		`
	}

	testForOfNestedIf() {
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

	testForOfLocalVariableTransferring() {
		let prop = this.prop

		return html`
			<lu:for ${n} of ${[1,2,3]}>
				${n + prop}
			</lu:for>
		`
	}

	testForOfTracking() {
		return html`
			<lu:for ${item} of ${this.items}>
				${item.value}
			</lu:for>
		`
	}

	testForOfMethodGetTracking() {
		return html`
			<lu:for ${item} of ${this.getItems()}>
				${item.value}
			</lu:for>
		`
	}

	testForOfVariableTracking() {
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
