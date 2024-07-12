import {Observed} from '@pucelle/ff'
import {Component} from '@pucelle/lupos.js'


class TestObservedVariableType {

	variables() {
		var a = {value:1} as Observed<{value: number}>
   		var b: Observed<{value: number}> = {value:1}
		var c = b

		return a.value
			+ b.value
			+ c.value
	}

	VariableObjectDeconstructedAssignment() {
		var o = {prop:{value:1}} as Observed<{prop:{value: number}}>
   		var {prop} = o

		return prop.value
	}

	variableArrayDeconstructedAssignment() {
		var a = [{value:1}] as Observed<{value: number}[]>
   		var [item] = a

		return item.value
	}
}


class TestObservedParameter {

	prop: {value: number} = {value: 1}

	parameterAs(a = {value:1} as Observed<{value: number}>) {
		return a.value
	}

	parameterType(a: Observed<{value: number}>) {
		return a.value
	}

	parameterThis(this: Observed<TestObservedParameter>) {
		return this.prop.value
	}
}


class TestObservedPropertyAtUnobserved {

	prop: Observed<{value: number}> = {value: 1}
	unObservedProp: {value: number} = {value: 1}

	getPropValue() {
		return this.prop.value
	}

	getAsProp() {
		return (this.unObservedProp as Observed<{value: number}>).value
	}
}


class TestObservedProperty extends Component {

	prop = {value: 1}

	getPropValueUseMethod() {
		return this.getPropValue(this.prop)
	}

	getPropValue(prop: Observed<{value: number}>) {
		return prop.value
	}

	expressionDistinct() {
		return this.prop.value + (this.prop as Observed<{value: number}>).value
	}
}


class TestArrayMapObservedParameter {

	prop: {value: number}[] = [{value:1}]

	arrowFnImplicitReturn() {
		return this.prop.map((v: Observed<{value: number}>) => v.value).join('')
	}

	arrowFnBlockBody() {
		return this.prop.map((v: Observed<{value: number}>) => {return v.value}).join('')
	}

	normalFn() {
		return this.prop.map(function(v: Observed<{value: number}>){return v.value}).join('')
	}
}


class TestMethodReturnedType extends Component {

	prop: {value: string} = {value: 'Text'}

	getValueUseMethod() {
		var item = this.getNormalItem() as Observed<{value: string}>
		return item.value
	}

	getValueUseMethodSingleExp() {
		return (this.getNormalItem() as Observed<{value: string}>).value
	}

	getNormalItem(): {value: string} {
		return this.prop
	}

	getValueUseObservedMethod() {
		var item = this.getObservedItem()
		return item.value
	}

	getValueUseObservedMethodSingleExp() {
		return this.getObservedItem().value
	}

	getObservedItem(): Observed<{value: string}> {
		return this.prop
	}

	getValueUseObservedInstance() {
		return this.getInstance().prop.value
	}

	getInstance(): TestMethodReturnedType {
		return this
	}
}