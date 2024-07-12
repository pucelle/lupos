import {Observed} from '@pucelle/ff'
import {Component} from '@pucelle/lupos.js'


class TestRef extends Component {

	prop: {value: number} = {value: 1}

	getProp(): Observed<{value: number}> {
		return this.prop
	}

	getNextProp(_value: number): Observed<{value: number}> {
		return this.prop
	}

	doubleVariableDeclarationRef() {
		let i = this.prop.value, j = this.getNextProp(i).value;
		return ''
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
		return false
	}

	elseIfRef() {
		if (Boolean(1)) {
			return true
		}
		else if (this.getProp().value) {
			return true
		}
		return false
	}

	multipleConditionalRef() {
		return this.getProp().value
			? this.getNextProp(0).value
				? 1
				: 2
			: this.getNextProp(1).value
				? 3
				: 4
	}

	multipleBinaryRef() {
		return this.getProp().value || this.getNextProp(0).value || this.getNextProp(1).value
	}

	deepRef() {
		return this.getNextProp(this.getProp().value).value
	}

	parameterRef(value = this.getProp().value) {
		return value
	}

	indexRef() {
		let a: Observed<{value:number}[]> = [this.prop]
		let i = 0
		return a[i++].value
	}

	forVariableInitializerRef() {
		for (let i = this.getProp().value; i < 1; i++) {
			break
		}

		return ''
	}

	forDoubleVariableInitializerRef() {
		for (let i = this.prop.value, j = this.getNextProp(i).value; j < 1; j++) {
			break
		}

		return ''
	}

	forExpressionInitializerRef() {
		let i: any
		for (i = this.getProp().value; i < 1; i++) {
			break
		}

		return ''
	}

	forConditionRef() {
		for (let i = 0; i < this.getProp().value; i++) {
			break
		}

		return ''
	}

	forIncreasementRef() {
		for (let i = 0; i < 1; i += this.getProp().value) {
			break
		}

		return ''
	}
}
