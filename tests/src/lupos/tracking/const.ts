import {Component} from 'lupos.html'
import {Observed} from '../../../../web/out'


export class TestAsConst extends Component {

	readonly prop1: {value: string} = {value: 'Text'} as const
	readonly prop2: [{value: string}] = [{value: 'Text'}] as const

	render() {
		return this.prop1.value + this.prop2[0].value
	}

	getAsConstProp() {
		let a: Observed<{value: string}> = {value: 'Text'} as const
		return a.value
	}
}
