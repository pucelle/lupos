import {Component} from '@pucelle/lupos.js'


class TestMap extends Component {

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


class TestSet extends Component {

	set: Set<number> = new Set()

	has() {
		return this.set.has(0)
	}

	size() {
		return this.set.size
	}

	clear() {
		this.set.clear()
	}
}
