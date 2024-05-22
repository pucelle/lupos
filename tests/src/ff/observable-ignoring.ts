import {Observed} from '@pucelle/ff'
import {Component} from '@pucelle/lupos.js'


class TestIgnoringMethod extends Component {

	render() {
		return this.renderMore()
	}

	renderMore() {
		return ''
	}
}


interface MethodSignature {
	property: () => string
	method(): string
}

class TestIgnoringMethodSignature extends Component {

	member: Observed<MethodSignature> = {property: () => '', method(){return ''}}

	render() {
		return this.member.property() + this.member.method()
	}
}


class TestIgnoringInternalMethods extends Component {

	prop1: Array<number> = [1, 2]
	prop2: Map<number, number> = new Map([[1, 2]])

	render() {
		return this.prop1.join('')!
			+ this.prop2.get(1)!
	}
}


class TestIgnoringNothingReturnedMethod extends Component {

	prop: number = 1

	noReturnedMethod1() {
		this.prop
	}
}

