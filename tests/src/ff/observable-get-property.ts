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

	prop: {value: 'Text'} | undefined = undefined

	render() {
		return '' + this.prop?.value
			+ this.prop?.['value']
	}
}


class TestMethodReturnedProp extends Component {

	prop: {value: string} = {value: 'Text'}

	render1() {
		var item = this.getItem()
		return item.value
	}

	render2() {
		return this.getItem().value
	}

	getItem(): Observed<{value: string}> {
		return this.prop
	}

	render3() {
		return this.getInstance().prop.value
	}

	getInstance(): TestMethodReturnedProp {
		return this
	}
}