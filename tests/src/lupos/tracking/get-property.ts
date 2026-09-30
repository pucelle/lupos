import {Observed} from '../../../../web/out'
import {Component} from 'lupos.html'


export class TestNormalProp extends Component {

	prop1: number =  1
	prop2: number =  1

	getProp() {
		return this.prop1
	}

	destructedGetProp() {
		let {prop1, prop2} = this
		return prop1 + prop2
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
	propDeeper: {value: {value: number}} | undefined = undefined
	propDeeperList: {value: {list: number[]}} | undefined = undefined

	getProp() {
		return '' + this.prop?.value
			+ this.prop?.['value']
	}

	getPropDeeper() {
		return this.propDeeper?.value.value ?? 0
	}

	getPropDeeperList() {
		return this.propDeeperList?.value.list.length ?? 0
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

	/** Track the literal key checked by a native instance method. */
	hasOwnValue() {
		return this.prop.hasOwnProperty('value')
	}

	/** Track the literal key checked by the static Object API. */
	hasOwnValueStatic() {
		return Object.hasOwn(this.prop, 'value')
	}

	/** Keep literal-key tracking inside an optional call. */
	hasOwnOptionalValue(prop: Observed<{value: number}> | undefined) {
		return prop?.hasOwnProperty('value')
	}

	/** Track the checked property using the current dynamic key. */
	hasOwnDynamicKey(key: string) {
		return this.prop.hasOwnProperty(key)
	}

	/** Evaluate a computed instance-method key only once. */
	hasOwnDynamicKeyCall(key: () => string) {
		return this.prop.hasOwnProperty(key())
	}

	/** Evaluate a computed static-method key only once. */
	hasOwnDynamicKeyStaticCall(key: () => string) {
		return Object.hasOwn(this.prop, key())
	}

	/** Skip the computed key when the optional receiver is absent. */
	hasOwnOptionalDynamicKeyCall(prop: Observed<{value: number}> | undefined, key: () => string) {
		return prop?.hasOwnProperty(key())
	}

	/** Track the key used by the check, not its subsequently assigned value. */
	hasOwnReassignedKey() {
		let key = 'value'
		let value = this.prop.hasOwnProperty(key)
		key = 'other'
		return value
	}

	/** Keep each loop-key dependency inside its declaration scope. */
	hasOwnLoopKeys(keys: string[]) {
		let values: boolean[] = []

		for (let key of keys) {
			values.push(this.prop.hasOwnProperty(key))
		}

		return values
	}

	/** Evaluate a computed observed receiver only once. */
	hasOwnReceiverCall(get: () => {value: number}) {
		return (get() as Observed<{value: number}>).hasOwnProperty('value')
	}

	/** Avoid tracking user-defined methods which happen to use the native name. */
	hasOwnCustomMethod(object: Observed<{hasOwnProperty(key: string): boolean}>) {
		return object.hasOwnProperty('value')
	}

	/** Leave native checks on unobserved objects untracked. */
	hasOwnPlainValue(prop: {value: number}) {
		return prop.hasOwnProperty('value')
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
