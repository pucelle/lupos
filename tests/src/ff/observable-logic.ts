import {Component} from '@pucelle/lupos.js'


export class TestAndOrDoubleQuestionOperators extends Component {

	prop1: {value: string} = {value: '1'}
	prop2: {value: string} = {value: '2'}

	and() {
		return this.prop1.value && this.prop2.value
	}

	or() {
		return this.prop1.value || this.prop2.value
	}

	qq() {
		return this.prop1.value ?? this.prop2.value
	}

	orProp() {
		return (this.prop1 || this.prop2).value
	}

	andProp() {
		return (this.prop1 && this.prop2).value
	}

	qqProp() {
		return (this.prop1 ?? this.prop2).value
	}
}


export class TestTernaryConditionalOperator extends Component {

	prop1: {value: string} | undefined = undefined
	prop2: {value: string} | undefined = undefined

	byProp() {
		return this.prop1
			? this.prop1.value
			: this.prop2
			? this.prop2.value
			: ''
	}

	byParenthesizedProp() {
		return (this.prop1 ? this.prop1 : this.prop2!).value
	}
}
