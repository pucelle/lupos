import {Observed} from '@pucelle/ff'
import {Component} from '@pucelle/lupos.js'


class TestObservedVariableType {

	render() {
		var a = {value:1} as Observed<{value: number}>
   		var b: Observed<{value: number}> = {value:1}
		var c = b

		return a.value
			+ b.value
			+ c.value
	}
}


class TestObservedParameters {

	prop: {value: number} = {value:1}

	renderProp1(this: Observed<TestObservedParameters>) {
		return this.prop.value
	}

	renderProp2() {
		return (this.prop as Observed<{value: number}>).value
	}

	renderProp3(item: Observed<{value: number}>) {
		return item.value
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


class TestArrayMapFn {

	prop: {value: number}[] = [{value:1}]

	render1() {
		return this.prop.map((v: Observed<{value: number}>) => v.value).join('')
	}

	render2() {
		return this.prop.map((v: Observed<{value: number}>) => {return v.value}).join('')
	}

	render3() {
		return this.prop.map(function(v: Observed<{value: number}>){return v.value}).join('')
	}
}
