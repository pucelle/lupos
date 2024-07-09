import {Component} from '@pucelle/lupos.js'


class TestAndOrDoubleQuestionOperators extends Component {

	prop1: {value: string} = {value: '1'}
	prop2: {value: string} = {value: '2'}

	// and() {
	// 	return this.prop1.value && this.prop2.value
	// }

	// or() {
	// 	return this.prop1.value || this.prop2.value
	// }

	// qq() {
	// 	return this.prop1.value ?? this.prop2.value
	// }

	orProp() {
		return (this.prop1 || this.prop2).value
	}

	// andProp() {
	// 	return (this.prop1 && this.prop2).value
	// }

	// qqProp() {
	// 	return (this.prop1 ?? this.prop2).value
	// }
}


// class TestTernaryConditionalOperator extends Component {

// 	prop1: {value: string} | undefined = undefined
// 	prop2: {value: string} | undefined = undefined

// 	render1() {
// 		return this.prop1
// 			? this.prop1.value
// 			: this.prop2
// 			? this.prop2.value
// 			: ''
// 	}

// 	render2() {
// 		return (this.prop1 ? this.prop1 : this.prop2!).value
// 	}
// }
