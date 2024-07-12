import {Component} from '@pucelle/lupos.js'


class TestIgnoringMethod extends Component {

	ignoreMethod() {
		return this.anyMethod()
	}

	anyMethod() {
		return ''
	}
}


interface MethodSignature {
	property: () => string
	method(): string
}

class TestNotIgnoringFnPropertySignature extends Component {

	member: MethodSignature = {
		property: () => '',
		method(){return ''}
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

