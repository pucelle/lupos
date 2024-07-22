import {Observed} from '@pucelle/ff'
import {Component} from '@pucelle/lupos.js'


class TestMutable extends Component {

	prop: {value: number}[] = [{value: 1}, {value: 2}]

	dynamicVariableAsIndex() {
		let index = 0

		this.prop[index].value
		index++
		this.prop[index].value

		return ''
	}

	dynamicIndexChangeOtherWhere() {
		let index = {value: 0}

		this.prop[index.value].value
		index.value++
		this.prop[index.value].value
		
		return ''
	}

	dynamicExp() {
		let a = this.prop[0]
		a.value = 1

		a = this.prop[1]
		a.value = 2
	}

	dynamicExpAndIndexParam() {
		let index = 0
		let a = this.getItem(index++)
		a.value = 1

		a = this.getItem(index++)
		a.value = 2
	}

	getItem(index: number): Observed<{value: number}> {
		return this.prop[index]
	}
}


