import {Observed, computed, effect, watch, watchMulti, Connectable, asyncComputed} from '../../../web/out'
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


export class TestAsyncComputed extends Component {

	@asyncComputed(async function(){
		await Promise.resolve()
		return 1
	})
	prop: number = 0

	@asyncComputed(async function(){
		await Promise.resolve()
		return 1
	}, true)
	propContinuous: number = 0
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


export class TestWatchMulti extends Component {

	prop1: number = 1
	prop2: number = 2

	@watchMulti([
		'prop1',
		function(this: TestWatchMulti) {return this.prop2},
	], {immediate: true})
	onPropsChange([prop1, prop2]: [number, number]) {
		console.log(prop1, prop2)
	}
}


export class TestObservedImplemented implements Connectable, Observed {

	prop: number = 1

	onCreated() {}
	onConnected() {}
	onWillDisconnect() {}

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


export class TestConnectableAsProperty implements Connectable {

	prop: TestConnectable = new TestConnectable()
	propNoInitializer!: TestConnectable

	onCreated() {}
	onConnected() {}
	onWillDisconnect() {}
}
