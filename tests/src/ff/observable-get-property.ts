import {Observed} from '@pucelle/ff'
import {Component} from '@pucelle/lupos.js'


class TestNormalProp extends Component {

	prop: number =  1

	getProp() {
		return this.prop
	}

	destructedGetProp() {
		let {prop} = this
		return prop
	}
}


class TestElementProp extends Component {

	prop: number =  1

	getProp() {
		let prop = 'prop' as 'prop'

		return this['prop']
			+ this[prop]
	}
}


class TestObjectProp extends Component {

	prop = {value: 1}

	getProp() {
		return this.prop.value
	}

	destructedGetProp() {
		let {prop: {value}} = this
		return value
	}
}


class TestRepetitiveProp extends Component {

	prop = {value: 1}

	getProp() {
		return this.prop.value
			+ this.prop.value
			+ this.prop["value"]
			+ this.prop['value']
	}
}


class TestGroupedProp extends Component {

	prop1 = {value1: 1, value2: 2}
	prop2 = {value: 1}

	getProp() {
		return this.prop1.value1
			+ this.prop1.value2
			+ this.prop2.value
	}
}


class TestQuestionDotPropMerge extends Component {

	prop: {value: number} | undefined = undefined

	getProp() {
		return '' + this.prop?.value
			+ this.prop?.['value']
	}
}


class TestNonObservedClass {

	prop: Observed<{value: number}> = {value: 1}

	getProp() {
		return this.prop.value
	}
}
