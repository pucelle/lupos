import {Component} from '@pucelle/lupos.js'


export class TestNormalProp extends Component {

	prop: number =  1

	setProp() {
		this.prop = 1
	}
}


export class TestElementProp extends Component {

	prop: number =  1

	setProp() {
		let prop = 'prop' as 'prop'
		this['prop'] = 1
		this[prop] = 1
	}
}


export class TestObjectProp extends Component {

	prop = {value: 1}

	setProp() {
		this.prop.value = 1
	}
}


export class TestDeconstructAssignment extends Component {

	prop = {value: 1}

	array() {
		[this.prop] = [{value:2}]
	}

	object() {
		({prop: this.prop} = {prop: {value:2}})
	}
}


export class TestRepetitiveProp extends Component {

	prop = {value: 1}

	setProp() {
		this.prop.value = 1
		this.prop.value = 2
		this.prop["value"] = 1
		this.prop['value'] = 2
	}
}


export class TestGroupedProp extends Component {

	prop1 = {value1: 1, value2: 2}
	prop2 = {value: 1}

	setProp() {
		this.prop1.value1 = 1
		this.prop1.value2 = 2
		this.prop2.value = 1
	}
}


export class TesOperators extends Component {

	prop: number =  1

	plusEquals() {
		this.prop += 1
	}

	minusEquals() {
		this.prop -= 1
	}

	asteriskEquals() {
		this.prop *= 1
	}

	asteriskAsteriskEquals() {
		this.prop **= 1
	}

	slashEquals() {
		this.prop /= 1
	}

	percentEquals() {
		this.prop %= 1
	}

	lessThanLessThanEquals() {
		this.prop <<= 1
	}

	greaterThanGreaterThanEquals() {
		this.prop >>= 1
	}

	ampersandEquals() {
		this.prop &= 1
	}

	ampersandAmpersandEquals() {
		this.prop &&= 1
	}

	barEquals() {
		this.prop |= 1
	}

	barBarEquals() {
		this.prop ||= 1
	}

	questionEquals() {
		this.prop ??= 1
	}

	caretEquals() {
		this.prop ^= 1
	}

	plusPlusPrefix() {
		++this.prop
	}

	minusMinusPrefix() {
		--this.prop
	}

	plusPlusPostfix() {
		this.prop++
	}

	minusMinusPostfix() {
		this.prop--
	}
}


export class TestDelete extends Component {

	prop: Record<string, string> = {}

	deleteProperty() {
		delete this.prop.sub
	}
}


export class TestNew extends Component {
	prop: number = 1

	getInstance(): TestNew | null {
		return this
	}
}

let com = new TestNew()
com.prop = 1

let com2 = com.getInstance()
com2!.prop = 2