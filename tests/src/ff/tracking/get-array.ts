import {Observed} from '@pucelle/ff'
import {Component} from '@pucelle/lupos.js'


export class TestArrayIndex extends Component {

	prop: {value: number}[] = [{value:1}]

	fixedIndex() {
		return this.prop[0].value
	}

	dynamicIndex() {
		let i = 0
		return this.prop[i].value
	}

	getLast() {
		if (this.prop.length > 0) {
			return this.prop[this.prop.length - 1].value
		}

		return undefined
	}
}


export class TestArrayTuple extends Component {

	prop: [number, number] = [1, 1]

	fixedIndex() {
		return this.prop[0] + this.prop[1]
	}
}


export class TestArrayMethods extends Component {

	prop: number[] = [1]

	push() {
		this.prop.push(1)
	}

	filter(fn: any) {
		return this.prop.filter(fn)
	}

	refedFilter(fn: any) {
		let prop = this.prop
		prop = prop.filter(fn)
		return prop
	}
}


type ArrayProp = {value: number}[]
type ArrayPropAlias = ArrayProp

export class TestAliasArrayTypeOfProp extends Component {

	prop: ArrayPropAlias = [{value:1}]

	arrayAliasType() {
		return this.prop[0].value
	}
}


export class TestArrayBroadcastingObservedToMapFn extends Component {

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


export class TestArrayElementSpread {

	prop: Observed<number[]> = [1]

	getProp() {
		return [...this.prop]
	}
}
