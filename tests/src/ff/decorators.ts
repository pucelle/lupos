import {Observed, computed, effect, immediateWatch, watch} from '@pucelle/ff'
import {Component} from '@pucelle/lupos.js'


class TestComputed extends Component {

	prop: number = 1

	@computed get prop2() {
		return this.prop + 1
	}
}


class TestEffect extends Component {

	propRead: number = 1
	propWrite: number = 1

	@effect onPropChangeEffect() {
		this.propWrite = this.propRead
	}
}


class TestWatchProperty extends Component {

	prop: number = 1

	@watch('prop', 'prop') onPropChange(prop: number) {
		console.log(prop)
	}

	@immediateWatch('prop') onImmediatePropChange(prop: number) {
		console.log(prop)
	}
}


class TestWatchCallback extends Component {

	prop: number = 1

	@watch(function(this: TestWatchCallback){return this.prop}) onPropChange(prop: number) {
		console.log(prop)
	}

	@immediateWatch(function(this: TestWatchCallback){return this.prop}) onImmediatePropChange(prop: number) {
		console.log(prop)
	}
}


class TestObservedImplemented implements Observed {

	prop: number = 1

	@effect onPropChangeEffect() {
		console.log(this.prop)
	}
}