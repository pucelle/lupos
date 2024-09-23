import {Component} from '@pucelle/lupos.js'


class TestArrayIndex extends Component {

	prop: {value: number}[] = [{value:1}]

	fixedIndex() {
		return this.prop[0].value
	}

	dynamicIndex() {
		let i = 0
		return this.prop[i].value
	}
}


class TestArrayMethods extends Component {

	prop: number[] = [1]

	push() {
		this.prop.push(1)
	}

	filter(fn: any) {
		return this.prop.filter(fn)
	}
}


type ArrayProp = {value: number}[]
type ArrayPropAlias = ArrayProp

class TestAliasArrayTypeOfProp extends Component {

	prop: ArrayPropAlias = [{value:1}]

	arrayAliasType() {
		return this.prop[0].value
	}
}


class TestArrayBroadcastingObservedToMapFn extends Component {

	prop: {value: number}[] = [{value:1}]

	mapArrowFnNoBlocking() {
		return this.prop.map(v => v.value).join('')
	}

	mapArrowFn() {
		return this.prop.map(v => {return v.value}).join('')
	}

	mapFn() {
		return this.prop.map(function(v){return v.value}).join('')
	}
}


