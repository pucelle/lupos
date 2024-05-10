import {computed, effect, watch} from '@pucelle/ff'
import {Component} from '@pucelle/lupos.js'


class C1 extends Component {

	prop: number = 1

	@computed prop2() {
		return this.prop + 1
	}

	@watch('prop') onPropChange(prop: number) {
		console.log(prop)
	}

	@effect onPropChangeEffect() {
		console.log(this.prop)
	}
}
