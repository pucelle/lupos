import {Component} from '@pucelle/lupos.js'


export class TestFunction extends Component {

	prop: number = 0
	list: {value: number}[] = [{value: 1}]

	testInstantlyRun() {
		let value = this.list.map(item => item.value)[0]
		this.prop = value
	}

	testNonInstantlyRun() {
		let getValue = () => {
			return this.list.map(item => item.value)[0]
		}
		this.prop = getValue()
	}

	testArrowFunctionBlockBody() {
		return () => {
			return this.prop === 0 ? 0 : 1
		}
	}

	testArrowFunctionNonBlockBody() {
		return () => this.prop === 0 ? 0 : 1
	}
}
