import {DeepReadonly, Observed} from '@pucelle/ff'
import {Component} from '@pucelle/lupos.js'


class TestObservedType {

	prop1: Observed<{value: number}> = {value:1}
	prop2 = {value:1} as Observed<{value: number}>
	map: Map<number, number> = new Map([[1, 2]])

	render() {
		var a = {value:1} as Observed<{value: number}>
   		var b: Observed<{value: number}[]> = [{value:1}]
		var c = b[0]

		return this.prop1.value
			+ this.prop2.value
			+ a.value
			+ b[0].value
			+ c.value
			+ this.map.get(1)!
	}
}




class TestProp extends Component {

	prop: string =  'Text'

	render() {
		return this.prop
	}
}


class TestPropObject extends Component {

	prop = {value: 'Text'}

	render() {
		return this.prop.value
	}
}


class TestPropRenderFn extends Component {

	prop = {value: 'Text'}

	render() {
		return this.renderProp(this.prop)
	}

	renderProp(prop: {value: string}) {
		return prop.value
	}
}


class TestObservedPropRenderFn extends Component {

	prop = {value: 'Text'}

	render() {
		return this.renderProp(this.prop)
	}

	renderProp(prop: Observed<{value: string}>) {
		return prop.value
	}
}


class TestReadonlyModifierProp extends Component {

	readonly prop: {value: string} = {value: 'Text'}

	render() {
		return this.prop.value
	}
}


class TestReadonlyProp extends Component {

	prop: Readonly<{value: string}> = {value: 'Text'}

	render() {
		return this.prop.value
	}
}


class TestDeepReadonlyProp extends Component {

	prop: DeepReadonly<{value: {value: string}}> = {value: {value: 'Text'}}

	render() {
		return this.prop.value.value
	}
}




class TestArrayProp extends Component {

	prop: {value: string}[] = [
		{value: 'Text1'},
		{value: 'Text2'},
		{value: 'Text3'},
	]

	render() {
		return this.prop.map(item => item.value).join(' ')
	}
}


class TestArrayPropRenderFn extends Component {

	prop: {value: string}[] = [
		{value: 'Text1'},
		{value: 'Text2'},
		{value: 'Text3'},
	]

	render() {
		return this.prop.map(item => this.renderItem(item)).join(' ')
	}

	renderItem(item: {value: string}) {
		return item.value
	}
}


class TestObservedArrayPropRenderFn extends Component {

	prop: {value: string}[] = [
		{value: 'Text1'},
		{value: 'Text2'},
		{value: 'Text3'},
	]

	render() {
		return this.prop.map(item => this.renderItem(item)).join(' ')
	}

	renderItem(item: Observed<{value: string}>) {
		return item.value
	}
}


class TestReadonlyArrayProp extends Component {

	prop: ReadonlyArray<{value: string}> = [
		{value: 'Text1'},
		{value: 'Text2'},
		{value: 'Text3'},
	]

	render() {
		return this.prop.map(item => item.value).join(' ')
	}
}


class TestDeepReadonlyArrayProp extends Component {

	prop: DeepReadonly<{value: string}[]> = [
		{value: 'Text1'},
		{value: 'Text2'},
		{value: 'Text3'},
	]

	render() {
		return this.prop.map(item => item.value).join(' ')
	}
}
