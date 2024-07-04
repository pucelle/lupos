import {Component} from '@pucelle/lupos.js'


class TestMap extends Component {

	map: Map<string, string> = new Map()

	has() {
		return this.map.has('')
	}

	get() {
		return this.map.get('')
	}
}


class TestSet extends Component {

	set: Set<string> = new Set()

	has() {
		return this.set.has('') + ''
	}
}
