import {Component} from '@pucelle/lupos.js'


class TestAndOrOperators extends Component {

	prop1: {value: string} = {value: '1'}
	prop2: {value: string} = {value: '2'}

	render1() {
		return this.prop1.value || this.prop2.value
	}

	render2() {
		return this.prop1.value && this.prop2.value
	}

	render3() {
		return (this.prop1 || this.prop2).value
	}

	render4() {
		return (this.prop1 && this.prop2).value
	}
}


class TestDoubleQuestionOperator extends Component {

	prop1: {value: string} | undefined = undefined
	prop2: {value: string} = {value: '1'}

	render() {
		return (this.prop1 ?? this.prop2).value
	}
}


class TestTernaryConditionalOperator extends Component {

	prop1: {value: string} | undefined = undefined
	prop2: {value: string} | undefined = undefined

	render1() {
		return this.prop1
			? this.prop1.value
			: this.prop2
			? this.prop2.value
			: ''
	}

	render2() {
		return (this.prop1 ? this.prop1 : this.prop2!).value
	}
}
