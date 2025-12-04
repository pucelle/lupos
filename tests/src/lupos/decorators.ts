import {Observed, computed, effect, watch, Connectable} from '../../../web/out'
import {Component} from 'lupos.html'


export class TestComputed extends Component {

	prop: number = 1

	@computed
	get prop2() {
		return this.prop + 1
	}
}

export class TestComputedDerived extends TestComputed {

	@computed
	get prop2() {
		return this.prop + 2
	}
}


export class TestEffect extends Component {

	propRead: number = 1
	propWrite: number = 1

	@effect
	onPropChangeEffect() {
		this.propWrite = this.propRead
	}
}

export class TestEffectDerived extends TestEffect {

	@effect
	onPropChangeEffect() {
		this.propWrite = this.propRead + 1
	}
}


export class TestWatchProperty extends Component {

	prop: number = 1

	@watch('prop')
	onPropChange(prop: number) {
		console.log(prop)
	}
}

export class TestWatchPropertyDerived extends TestWatchProperty {

	@watch('prop')
	onPropChange(prop: number) {
		console.log(prop + 1)
	}
}


export class TestWatchCallback extends Component {

	prop: number = 1

	@watch(function(this: TestWatchCallback){return this.prop})
	onPropChange(prop: number) {
		console.log(prop)
	}
}

export class TestWatchCallbackDerived extends TestWatchCallback {

	@watch(function(this: TestWatchCallback){return this.prop})
	onPropChange(prop: number) {
		console.log(prop + 1)
	}
}


export class TestObservedImplemented implements Observed {

	prop: number = 1

	@effect
	onPropChangeEffect() {
		console.log(this.prop)
	}
}

export class TestConnectable implements Connectable, Observed {

	prop: number = 1

	onCreated() {}
	onConnected() {}
	onWillDisconnect() {}

	@effect
	onPropChangeEffect() {
		console.log(this.prop)
	}
}