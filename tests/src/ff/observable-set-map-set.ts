import {Component} from '@pucelle/lupos.js'


class TestMap extends Component {

	map: Map<number, number> = new Map()

	set() {
		this.map.set(0, 1)
	}
}


class TestSet extends Component {

	set: Set<number> = new Set()

	add() {
		this.set.add(0)
	}
}
