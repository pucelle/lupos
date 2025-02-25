import {ListMap, MethodsObserved, Observed} from '@pucelle/ff'
import {Component} from '@pucelle/lupos.js'


export class TestObservedVariableType {

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


export class TestObservedParameter {

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


export class TestObservedPropertyAtUnobserved {

	observedTypeProp: Observed<{value: number}> = {value: 1}
	observedInitProp = {value: 1} as Observed<{value: number}>
	unObservedProp: {value: number} = {value: 1}

	getObservedTypePropValue() {
		return this.observedTypeProp.value
	}

	getObservedInitPropValue() {
		return this.observedInitProp.value
	}

	getAsProp() {
		return (this.unObservedProp as Observed<{value: number}>).value
	}
}


export class TestObservedProperty extends Component {

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


export class TestArrayMapObservedParameter {

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


export class TestMethodReturnedType extends Component {

	prop: {value: string} = {value: 'Text'}

	getNormalItem(): {value: string} {
		return this.prop
	}

	getValueUseMethod() {
		var item = this.getNormalItem() as Observed<{value: string}>
		return item.value
	}

	getValueUseMethodSingleExp() {
		return (this.getNormalItem() as Observed<{value: string}>).value
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


export class TestClassTypeParameter<T extends Observed<{value: number}>> {

	getItems(item: T) {
		return item.value
	}

	setItems(item: T) {
		item.value = 1
	}
}


export class TestMethodsObserved implements Observed {

	listData: ListMap<number, number> = new ListMap()

	getListItem(key: number) {
		return this.listData.get(key)
	}

	addListItem(key: number, value: number) {
		this.listData.add(key, value)
	}

	getListItemAsVariable(key: number) {
		let listData = this.listData
		return listData.get(key)
	}

	addListItemAsVariable(key: number, value: number) {
		let listData = this.listData
		listData.add(key, value)
	}
}


export class TestPropertyMethodsObserved {

	data: Observed<AnyMethodsObserved> = new AnyMethodsObserved()

	getItem() {
		return this.data.get()
	}

	addItem() {
		this.data.set(1)
	}

	getItemAsVariable() {
		let data = this.data
		return data.get()
	}

	addItemAsVariable() {
		let data = this.data
		data.set(1)
	}
}

class AnyMethodsObserved implements MethodsObserved<'get', 'set'> {
	value: number = 1
	get() {
		return this.value
	}
	set(value: number) {
		this.value = value
	}
}