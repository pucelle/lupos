import {Observed} from '../../../../web/out'
import {Component} from '@pucelle/lupos.js'


export class TestNormalProp extends Component {

	prop: number =  1

	getProp() {
		return this.prop
	}

	destructedGetProp() {
		let {prop} = this
		return prop
	}
}


export class TestElementProp extends Component {

	prop: number =  1

	getProp() {
		let prop = 'prop' as 'prop'

		return this['prop']
			+ this[prop]
	}
}


export class TestObjectProp extends Component {

	prop = {value: 1}

	getProp() {
		return this.prop.value
	}

	destructedGetProp() {
		let {prop: {value}} = this
		return value
	}
}


export class TestNullableProp extends Component {

	prop: {value: number} | null = {value: 1}

	getProp() {
		return this.prop?.value
	}
}


export class TestRepetitiveProp extends Component {

	prop = {value: 1}

	getProp() {
		return this.prop.value
			+ this.prop.value
			+ this.prop["value"]
			+ this.prop['value']
	}
}


export class TestGroupedProp extends Component {

	prop1 = {value1: 1, value2: 2}
	prop2 = {value: 1}

	getProp() {
		return this.prop1.value1
			+ this.prop1.value2
			+ this.prop2.value
	}
}


export class TestQuestionDotPropMerge extends Component {

	prop: {value: number} | undefined = undefined

	getProp() {
		return '' + this.prop?.value
			+ this.prop?.['value']
	}
}


export class TestNonObservedClass {

	prop: Observed<{value: number}> = {value: 1}

	getProp() {
		return this.prop.value
	}
}


export class TestAssignmentSpread {

	prop: Observed<{value: number}> = {value: 1}

	getProp() {
		return {...this.prop}
	}
}


export class TestObjectAPIs extends Component {

	prop: Observed<{value: number}> = {value: 1}

	getKeys() {
		return Object.keys(this.prop)
	}

	getValues() {
		return Object.values(this.prop)
	}

	getEntries() {
		return Object.entries(this.prop)
	}

	assign() {
		return Object.assign({}, this.prop)
	}
}