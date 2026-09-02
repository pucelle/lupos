import {Component} from 'lupos.html'


export class TestMap extends Component {

	map: Map<number, number> = new Map()

	has() {
		return this.map.has(0)
	}

	get() {
		return this.map.get(0)
	}

	size() {
		return this.map.size
	}

	clear() {
		this.map.clear()
	}
}


export class TestObservingOfMapMember extends Component {

	map: Map<number, {value: number}> = new Map()
	list: {value: number, visible: boolean}[] = []

	getValue() {
		return this.map.get(0)!.value
	}

	getValueQuery() {
		return this.map.get(0)?.value
	}

	getValueByVariable() {
		let item = this.map.get(0)!
		return item.value
	}

	findAtList() {
		let item = this.list.find(v => v.value === 0)!
		return item.value
	}

	forOfKeys() {
		let sum = 0
		
		for (let value of this.map.keys()) {
			sum += value
		}

		return sum
	}

	forOfValues() {
		let sum = 0
		
		for (let value of this.map.values()) {
			sum += value.value
		}

		return sum
	}

	forOfKeyValues() {
		let sum = 0
		
		for (let [key, value] of this.map) {
			sum += key + value.value
		}

		return sum
	}

	filterList() {
		let items = this.list.filter(v => v.value === 0)!
		items.push({value: 1, visible: true})
		return items.map(v => v.value)
	}

	filterListWithDifferentRead() {
		let items = this.list.filter(v => v.visible)
		return items.map(v => v.value)
	}

	filterListIndex() {
		let item = this.list.filter(v => v.visible)[0]
		return item.value
	}

	filterListForOf() {
		let total = 0
		for (let item of this.list.filter(v => v.visible)) {
			total += item.value
		}
		return total
	}

	filterListDestructuring() {
		let [item] = this.list.filter(v => v.visible)
		return item.value
	}

	sortFilteredListWithoutAnyReference() {
		return this.list
			.filter(v => v.visible)
			.sort((a, b) => a.value - b.value)
			.map(v => v.value)
	}

	copyingMethodsPreserveElements() {
		let item1 = this.list.slice().at(0)!
		let item2 = this.list.toReversed().findLast(v => v.visible)!
		let item3 = this.list.concat([])[0]
		return item1.value + item2.value + item3.value
	}

	spreadAndConditionalCopies(useFilter: boolean) {
		let filtered = this.list.filter(v => v.visible)
		let items = useFilter ? [...filtered] : this.list.slice()
		return items.map(v => v.value)
	}
}


export class TestSet extends Component {

	set: Set<number> = new Set()

	has() {
		return this.set.has(0)
	}

	forOf() {
		let sum = 0

		for (let value of this.set) {
			sum += value
		}

		return sum
	}

	size() {
		return this.set.size
	}

	clear() {
		this.set.clear()
	}
}
