import {Component} from '@pucelle/lupos.js'


class TestIgnoringStringIndex extends Component {

	prop: string = '1'

	ignoreStringIndex() {
		return this.prop[0]
	}
}


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


class TestIgnoringConstructor extends Component {

	prop: number

	constructor() {
		super()
		this.prop = 2
	}
}


class TestIgnoringReadonlyPrivate extends Component {

	private prop: number = 1

	readMethod() {
		return this.prop
	}
}


class TestIgnoringWriteonlyPrivate extends Component {

	private prop: number = 1

	readMethod() {
		this.prop = 2
	}
}