import {effect, MethodsToObserve, Observed, UnObserved, ParameterToObserve, SetOfParameterToObserve} from '../../../../web/out'
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

	variableArrayDeconstructedAssignmentOfElementsObserved() {
		var a: Observed<{value: number}> = {value: 1}
		var b: Observed<{value: number}> = {value: 1}
		var [c, d] = [a, b]
		return c.value + d.value
	}

	variableGetter() {
		var a: Observed<{get b(): number}> = {get b(){return 1}}
		return a.b
	}

	variableInstanceGetter() {
		var a: Observed<ObservedHasGetter> = new ObservedHasGetter()
		return a.b
	}

}

class ObservedHasGetter {
	get b(): number {
		return 1
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


interface ObservedInterface extends Observed{
	value: number
}

export class TestObservedInterface {

	getItems(item: ObservedInterface) {
		return item.value
	}

	setItems(item: ObservedInterface) {
		item.value = 1
	}
}


export class TestMethodsObserved implements Observed {

	listData: ListMap = new ListMap()

	getListItem(key: number) {
		return this.listData.get(key)
	}

	addListItem(key: number, value: number) {
		this.listData.set(key, value)
	}

	getListItemAsVariable(key: number) {
		let listData = this.listData
		return listData.get(key)
	}

	addListItemAsVariable(key: number, value: number) {
		let listData = this.listData
		listData.set(key, value)
	}
}

class ListMap implements MethodsToObserve<'get', 'set'> {
	get(key: number) {
		return key
	}
	set(key: number, value: number) {
		return key + value
	}
}


export class TestPropertyOfMethodsObserved {

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

	getItemAsParameter(data: Observed<AnyMethodsObserved>) {
		return data.get()
	}

	addItemAsParameter(data: Observed<AnyMethodsObserved>) {
		data.set(1)
	}

	mergeGetKeys() {
		this.data.value
		return this.data.get()
	}

	nullableDataGet() {
		let data: Observed<AnyMethodsObserved> | null = new AnyMethodsObserved()
		return data?.get()
	}

	@effect
	setOverlapSetKeys() {
		let a = this.data.get()
		this.data.set(a)
	}
}

class AnyMethodsObserved implements MethodsToObserve<'get', 'set'> {
	value: number = 1
	get() {
		return this.value
	}
	set(value: number) {
		this.value = value
	}
}


export class TestParameterGetSetToObserve extends Component {
	toGet: {value: number} = {value: 0}
	toSet: {value: number} = {value: 0}

	testGetOfFunction() {
		parameterGetToObserveFunction(this.toGet)
		return 1
	}

	testGetOfSpreadParameter() {
		parameterGetToObserveSpread(this.toGet)
		return 1
	}

	testGetOfStaticMethod() {
		ParameterGetSetToObserveTestClass.parameterGetToObserveStaticMethod(this.toGet)
		return 1
	}

	testGetOfMethod() {
		new ParameterGetSetToObserveTestClass(this.toGet).parameterGetToObserveMethod(this.toGet)
		return 1
	}

	testGetOfClassConstructor() {
		new ParameterGetSetToObserveTestClass(this.toGet)
		return 1
	}

	testSetOfFunction() {
		parameterSetToObserveFunction(this.toSet)
	}

	testSetOfStaticMethod() {
		ParameterGetSetToObserveTestClass.parameterSetToObserveStaticMethod(this.toSet)
	}

	testSetOfMethod() {
		new ParameterGetSetToObserveTestClass(this.toGet).parameterSetToObserveMethod(this.toSet)
	}
}

function parameterGetToObserveFunction(get: ParameterToObserve<{value: number}>) {
	return get.value
}
function parameterGetToObserveSpread(...gets: ParameterToObserve<{value: number}>[]) {
	return gets[0].value
}
function parameterSetToObserveFunction(set: SetOfParameterToObserve<{value: number}>) {
	set.value = 1
}

class ParameterGetSetToObserveTestClass {
	static parameterGetToObserveStaticMethod(get: ParameterToObserve<{value: number}>) {
		return get.value
	}
	static parameterSetToObserveStaticMethod(set: SetOfParameterToObserve<{value: number}>) {
		set.value = 1
	}
	constructor(get: ParameterToObserve<{value: number}>) {
		get.value
	}
	parameterGetToObserveMethod(get: ParameterToObserve<{value: number}>) {
		return get.value
	}
	parameterSetToObserveMethod(set: SetOfParameterToObserve<{value: number}>) {
		set.value = 1
	}
}


export class TestUnObserved extends Component {

	prop: {value: number} = {value: 1}
	readonly unObservedProp: UnObserved<{value: number}> = {value: 1}

	readAsUnObserved() {
		return (this as UnObserved<TestUnObserved>).prop
	}

	readThisAsUnObservedParameter(this: UnObserved<TestUnObserved>) {
		return this.prop
	}

	writeAsUnObserved() {
		(this as UnObserved<TestUnObserved>).prop.value = 1
	}

	writeThisUnObservedParameter(this: UnObserved<TestUnObserved>) {
		this.prop.value = 1
	}
	
	readUnObservedPropValue() {
		return this.unObservedProp.value
	}

	writeUnObservedPropValue() {
		this.unObservedProp.value = 1
	}

	assignUnObservedPropValue() {
		Object.assign(this.unObservedProp, {value: 1})
	}
}

export class TestUnObservedImplements extends Component implements UnObserved {

	prop: {value: number} = {value: 1}

	read() {
		return this.prop
	}

	write() {
		this.prop.value = 1
	}
}