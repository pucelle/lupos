import {Component} from 'lupos.html'


interface ReadonlyProp {
	readonly value: string
}

export class TestReadonlyModifier extends Component {

	readonly prop1: {value: string} = {value: 'Text'}
	prop2: ReadonlyProp = {value: 'Text'}

	render() {
		return this.prop1.value
			+ this.prop2.value
	}
}


export class TestReadonlyProp extends Component {

	prop: Readonly<{value: string}> = {value: 'Text'}

	render() {
		return this.prop.value
	}
}


export class TestReadonlyArrayProp extends Component {

	prop: ReadonlyArray<{value: string}> = [{value: 'Text1'}]

	render() {
		return this.prop.map(item => item.value).join(' ')
	}
}

