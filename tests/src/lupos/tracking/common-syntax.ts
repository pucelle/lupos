import {Observed} from '../../../../web/out'
import {Component} from 'lupos.html'


interface SyntaxItem {
	value: number
	nested?: {value: number}
}


export class TestCommonSyntax extends Component {

	item: SyntaxItem = {value: 1, nested: {value: 2}}
	items: SyntaxItem[] = [this.item]
	record: Record<string, SyntaxItem> = {item: this.item}

	testTryCatchFinally() {
		let value = 0

		try {
			value = this.item.value
		}
		catch (error: unknown) {
			value = error instanceof Error ? this.item.value : 0
		}
		finally {
			this.item.nested?.value
		}

		return value
	}

	testForIn() {
		let total = 0

		for (let key in this.record) {
			total += this.record[key].value
		}

		return total
	}

	async testForAwaitOf() {
		let total = 0

		for await (let item of this.items as Observed<SyntaxItem[]>) {
			total += item.value
		}

		return total
	}

	testDestructuringAndSpread() {
		let {value, nested = {value: 0}} = this.item
		let [first = this.item, ...rest] = this.items
		let clone = {...first, value: first.value + nested.value}

		return [value, clone, ...rest]
	}

	testOptionalAndComputedAccess(key: 'value') {
		return this.item?.[key] ?? this.item.nested?.value ?? 0
	}

	testFunctionForms() {
		let arrow = (value = this.item.value) => value + this.item.value
		
		let expression = function* (item: Observed<SyntaxItem>) {
			yield item.value
			yield* [item.nested?.value ?? 0]
		}

		return [arrow(), ...expression(this.item)]
	}
}
