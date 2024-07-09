import {Observed} from '@pucelle/ff'
import {Component} from '@pucelle/lupos.js'


class TestRef extends Component {

	prop: {value: string} = {value: '1'}

	getProp(): Observed<{value: string}> {
		return this.prop
	}

	getNextProp(_value: string): Observed<{value: string}> {
		return this.prop
	}

	normalRef() {
		return this.getProp().value
	}

	*yieldRef() {
		yield this.getProp().value
	}

	ifRef() {
		if (this.getProp().value) {
			return true
		}
	}

	elseIfRef() {
		if (Boolean(1)) {
			return true
		}
		else if (this.getProp().value) {
			return true
		}
	}

	deepRef() {
		return this.getNextProp(this.getProp().value).value
	}

	parameterRef(value = this.getProp().value) {
		return value
	}

	forVariableTypeInitializerRef() {
		for (let i = this.getProp().value; i; i = '') {
			break
		}
	}

	forExpressionTypeInitializerRef() {
		let i: any
		for (i = this.getProp().value; i; i = '') {
			break
		}
	}

	forConditionRef() {
		for (let i = ''; i === this.getProp().value; i = '') {
			break
		}
	}

	forIncreasementRef() {
		for (let i = ''; i === ''; i += this.getProp().value) {
			break
		}
	}
}
