import {Observed} from '../../../../web/out'
import {Component} from 'lupos.html'


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


export class TestArrayElementsSpread {

	prop: Observed<number[]> = [1]

	getProp(): Observed<number[]> {
		return [...this.prop]
	}

	getSpreadProp() {
		return [...this.getProp()]
	}
}


/** Optional Array reads retain guarded arguments and indexed access. */
export class TestOptionalArrayRead {

	/** Track collection reads through an optional native method. */
	includes(list: Observed<number[]> | undefined) {
		return list?.includes(1)
	}

	/** Skip an observed argument read when the list is absent. */
	includesArgument(list: Observed<number[]> | undefined, data: Observed<{value: number}>) {
		return list?.includes(data.value)
	}

	/** Nested reference assignments must not escape an optional initializer argument. */
	includesIndexedArgument(
		list: Observed<number[]> | undefined,
		data: Observed<{values: number[]}>,
		index: () => number
	) {
		let found = list?.includes(data.values[index()])
		return found
	}

	/** Evaluate a computed index once and only for a present list. */
	element(list: Observed<number[]> | undefined, index: () => number) {
		return list?.[index()]
	}

	/** Initializer references must remain inside the optional index guard. */
	elementVariable(list: Observed<number[]> | undefined, index: () => number) {
		let value = list?.[index()]
		return value
	}

	/** An inherited optional guard also skips the computed index. */
	elementNested(holder: Observed<{list: number[]}> | undefined, index: () => number) {
		return holder?.list[index()]
	}

	/** The list guard must not remove an independent optional receiver's guard. */
	elementOtherOptionalReceiver(
		list: Observed<number[]> | undefined,
		other: Observed<{index: number}> | undefined
	) {
		return list?.[other?.index ?? 0]
	}

	/** Guard optional length tracking on nullable receivers. */
	length(list: Observed<number[]> | null) {
		return list?.length
	}

	/** Tracking must not shift the positions of later call arguments. */
	callArguments(fn: ((key: number, value: number) => number) | undefined, data: Observed<{key: number, value: number}>) {
		return fn?.(data.key, data.value)
	}

	/** Keep spread dependencies guarded without altering the argument list. */
	callSpread(fn: ((key: number, value: number) => number) | undefined, values: Observed<[number, number]>) {
		return fn?.(...values)
	}
}
