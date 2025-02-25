import {Observed} from '@pucelle/ff'
import {Component} from '@pucelle/lupos.js'


export class TestRef extends Component {

	prop: {value: number} = {value: 1}

	getProp(): Observed<{value: number}> {
		return this.prop
	}

	getNextProp(_value: number): Observed<{value: number}> {
		return this.prop
	}

	doubleVariableDeclarationRef() {
		let i = this.prop.value, j = this.getNextProp(i).value;
		return j
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
		return 0
	}

	elseIfRef() {
		if (Boolean(1)) {
			return true
		}
		else if (this.getProp().value) {
			return true
		}
		return 0
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

	doubleIndexRef() {
		let a: Observed<{value:number}[][]> = [[this.prop]]
		let i = 0
		let j = 0
		return a[i++][j++].value
	}

	forVariableInitializerRef() {
		for (let i = this.getProp().value; i < 1; i++) {
			break
		}

		return 0
	}

	forDoubleVariableInitializerRef() {
		for (let i = this.prop.value, j = this.getNextProp(i).value; j < 1; j++) {
			break
		}

		return 0
	}

	forExpressionInitializerRef() {
		let i: any
		for (i = this.getProp().value; i < 1; i++) {
			break
		}

		return 0
	}

	forConditionRef() {
		for (let i = 0; i < this.getProp().value; i++) {
			break
		}

		return 0
	}

	forDoubleConditionRef() {
		for (let i = 0; i < this.getNextProp(i).value; i++) {
			break
		}

		return 0
	}

	forIncreasementRef() {
		for (let i = 0; i < 1; i += this.getProp().value) {
			break
		}

		return 0
	}

	forDoubleIncreasementRef() {
		for (let i = 0; i < 1; i += this.getNextProp(i).value) {
			break
		}

		return 0
	}

	caseDefaultRef() {
		var a: string = ''

        switch (a) {
            case '1':
            	this.getProp().value
				break;

			default:
				this.getProp().value
        }

        return 0
	}
}
