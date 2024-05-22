import {Component} from '@pucelle/lupos.js'


class TestArrayProp extends Component {

	prop: {value: number}[] = [{value:1}]

	render() {
		return this.prop[0].value + ''
	}
}


type ArrayProp = {value: number}[]
type ArrayPropAlias = ArrayProp

class TestAliasArrayTypeOfProp extends Component {

	prop: ArrayPropAlias = [{value:1}]

	render() {
		return this.prop[0].value + ''
	}
}


class TestArrayBroadcastingObservedToMapFn extends Component {

	prop: {value: number}[] = [{value:1}]

	render1() {
		return this.prop.map(v => v.value).join('')
	}

	render2() {
		return this.prop.map(v => {return v.value}).join('')
	}

	render3() {
		return this.prop.map(function(v){return v.value}).join('')
	}
}


