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
	list: {value: number}[] = []

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

	// /** Not supported yet. */
	// filterList() {
	// 	let items = this.list.filter(v => v.value === 0)!
	//  items.push({value: 1})
	// 	return items.map(v => v.value)
	// }

	// /** Not supported yet. */
	// sortList() {
	// 	let items = this.list
	// 	let items2 = items.sort()
	// 	return items2.map(v => v.value)
	// }

	// /** Not supported yet. */
	// sortFilteredListWithoutAnyReference() {
	// 	this.list.filter(v => v.value === 0)!
	// 		.sort()
	// 		.map(v => v.value)
	// }
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
