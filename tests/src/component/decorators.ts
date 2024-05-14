import {computed, effect, observable, watch} from '@pucelle/ff'
import {Component} from '@pucelle/lupos.js'


class C1 extends Component {

	prop: number = 1

	@computed prop2() {
		return this.prop + 1
	}
}


class C2 extends Component {

	prop: number = 1

	@effect onPropChangeEffect() {
		console.log(this.prop)
	}
}


class C3 extends Component {

	prop: number = 1

	@watch('prop') onPropChange(prop: number) {
		console.log(prop)
	}
}


class C4 extends Component {

	prop: number = 1

	@watch(function(this: C4){return this.prop}) onPropChange(prop: number) {
		console.log(prop)
	}
}


@observable
class C5 {

	prop: number = 1

	@effect onPropChangeEffect() {
		console.log(this.prop)
	}
}