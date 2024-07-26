import {Component} from '@pucelle/lupos.js'


class TestIgnoringStringIndex extends Component {

	prop: string = '1'

	ignoreStringIndex() {
		return this.prop[0]
	}
}


// This feature is not implemented.
// class TestIgnoringNotObservedInstanceAsProperty extends Component {

// 	notObservedInstance = new NotObservedClass()

// 	ignoreNonObservedInstance() {
// 		return this.notObservedInstance.value
// 	}
// }

// class NotObservedClass {
// 	value: number = 1
// }


class TestIgnoringMethod extends Component {

	ignoreMethod() {
		return this.anyMethod()
	}

	anyMethod() {
		return 0
	}
}


interface MethodSignature {
	property: () => number
	method(): number
}

class TestNotIgnoringFnPropertySignature extends Component {

	member: MethodSignature = {
		property: () => 0,
		method(){return 0}
	}

	notIgnoreFnProperty() {
		return this.member.property() + this.member.method()
	}
}


class TestIgnoringInternalMethods extends Component {

	prop1: Array<number> = [1, 2]
	prop2: Map<number, number> = new Map([[1, 2]])

	ignoreArrayMethods() {
		return this.prop1.join('')!
			+ this.prop2.get(1)!
	}
}


class TestIgnoringNothingReturnedMethod extends Component {

	prop: number = 1

	nothingReturnedMethod() {
		this.prop
	}
}

