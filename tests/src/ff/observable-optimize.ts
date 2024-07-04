import {Observed} from '@pucelle/ff'
import {Component} from '@pucelle/lupos.js'


class TestHoistIndexStatement extends Component {

	prop: {value: string}[] = [{value: 'Text'}, {value: 'Text'}]

	render1() {
		let result = ''
		let index = 0
		while (index < 2) {
			result += this.prop[index++].value
		}
		return result
	}

	render2() {
		let result = ''
		let index = -1
		while (index < 1) {
			result += this.prop[++index].value
		}
		return result
	}

	render3() {
		let result = ''
		let index = 1
		while (index >= 0) {
			result += this.prop[index--].value
		}
		return result
	}

	render4() {
		let result = ''
		let index = 2
		while (index > 0) {
			result += this.prop[--index].value
		}
		return result
	}

	render5() {
		let result = ''
		let index = 0

		result += this.prop[index].value
		index++
		result += this.prop[index].value

		return result
	}

	render6() {
		let result = ''
		let index = {value: 0}

		result += this.prop[index.value].value
		this.plusIndex(index)
		result += this.prop[index.value].value
		
		return result
	}

	plusIndex(index: {value: number}) {
		index.value++
	}

	render7() {
		let result = ''
		let index = 0

		result += this.getItem(index).value
		index++
		result += this.getItem(index).value
		
		return result
	}

	getItem(index: number) {
		return this.prop[index]
	}
}


class TestHoistPropInArrayMapFn extends Component {

	prop1: {value: number}[] = [{value:1}]
	prop2: number = 2

	render() {
		let c: Observed<{value: number}> = {value: 3}
		return this.prop1.map(v => v.value + this.prop2 + c.value).join('')
	}
}

