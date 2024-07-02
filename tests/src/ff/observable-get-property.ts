import {Observed} from '@pucelle/ff'
import {Component} from '@pucelle/lupos.js'


class TestNormalProp extends Component {

	prop: string =  'Text'

	render() {
		return this.prop
	}
}


class TestElementProp extends Component {

	prop: string =  'Text'

	render() {
		let prop = 'prop' as 'prop'

		return this['prop']
			+ this[prop]
	}
}


class TestObjectProp extends Component {

	prop = {value: 'Text'}

	render() {
		return this.prop.value
	}
}


class TestRepetitiveProp extends Component {

	prop = {value: 'Text'}

	render() {
		return this.prop.value
			+ this.prop.value
			+ this.prop["value"]
			+ this.prop['value']
	}
}


class TestGroupedProp extends Component {

	prop1 = {value1: 'Text', value2: 'Text'}
	prop2 = {value: 'Text'}

	render() {
		return this.prop1.value1
			+ this.prop1.value2
			+ this.prop2.value
	}
}


class TestQuestionDotPropMerge extends Component {

	prop: {value: string} | undefined = undefined

	render() {
		return '' + this.prop?.value
			+ this.prop?.['value']
	}
}
