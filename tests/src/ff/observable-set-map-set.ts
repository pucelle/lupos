import {Component} from '@pucelle/lupos.js'


export class TestMap extends Component {

	map: Map<number, number> = new Map()

	set() {
		this.map.set(0, 1)
	}
}


export class TestSet extends Component {

	set: Set<number> = new Set()

	add() {
		this.set.add(0)
	}
}
