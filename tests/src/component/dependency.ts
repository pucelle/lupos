import {Observed, observable} from '@pucelle/ff'
import {Component} from '@pucelle/lupos.js'


class C1 extends Component {

	prop1: string =  'Text'
	prop2 = {value: 'Text'}
	prop3 = {value: 'Text'}
	prop4 = {value: 'Text'}

	render() {
		return this.prop1 + this.renderProp1() + this.renderProp2()
		+ this.renderProp3(this.prop3) + this.get(this.prop4)
	}

	renderProp1() {
		return this.prop1
	}

	renderProp2() {
		return this.prop2.value
	}

	renderProp3(prop: {value: string}) {
		return prop.value
	}

	get(prop: Observed<{value: string}>) {
		return prop.value
	}
}



class C2 extends Component {

	data: {value: string}[] = [
		{value: 'Text1'},
		{value: 'Text2'},
		{value: 'Text3'},
	]

	get(prop: Observed<{value: string}>) {
		return prop.value
	}

	render() {
		return this.data.map(item => item.value).join(' ')
			+ this.data.map(item => this.get(item)).join(' ')
	}
}


class C3 extends Component {

	data: {value: string}[] = [
		{value: 'Text1'},
		{value: 'Text2'},
		{value: 'Text3'},
	]

	render() {
		return this.data.map(item => this.renderItem(item)).join(' ')
	}

	renderItem(item: Observed<{value: string}>) {
		return item.value
	}
}


function setValue() {
	let c = new C1()
	c.prop1 = 'test'
	c.prop2.value = 'test'
}