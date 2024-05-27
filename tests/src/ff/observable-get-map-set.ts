import {Component} from '@pucelle/lupos.js'


class TestMap extends Component {

	map: Map<string, string> = new Map()

	render1() {
		return this.map.has('')
	}

	render2() {
		return this.map.get('')
	}
}


class TestSet extends Component {

	set: Set<string> = new Set()

	render() {
		return this.set.has('') + ''
	}
}
