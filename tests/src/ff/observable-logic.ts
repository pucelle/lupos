import {Component} from '@pucelle/lupos.js'


class TestAndOrOperators extends Component {

	prop1: string = ''
	prop2: string = ''

	render1() {
		return this.prop1 || this.prop2
	}

	render2() {
		return this.prop1 && this.prop2
	}
}


class TestTernaryConditionalOperator extends Component {

	prop1: {value: string} | undefined = undefined
	prop2: {value: string} | undefined = undefined

	render() {
		return this.prop1
			? this.prop1.value
			: this.prop2
			? this.prop2.value
			: ''
	}
}
