import {Component} from 'lupos.html'
import {Observed} from '../../../../web/out'


export class TestArrayProp extends Component {

	prop: {value: number}[] = [{value:1}]

	fixedIndex() {
		this.prop[0].value += 1
	}

	dynamicIndex() {
		let i = 0
		this.prop[i].value += 1
	}
}


type ArrayProp = {value: number}[]
type ArrayPropAlias = ArrayProp

export class TestAliasArrayTypeOfProp extends Component {

	prop: ArrayPropAlias = [{value:1}]

	arrayAliasType() {
		this.prop[0].value += 1
	}
}


export class TestArrayBroadcastingObservedToEachFn extends Component {

	prop: {value: number}[] = [{value:1}]

	eachArrowFnNoBlocking() {
		this.prop.forEach(v => v.value += 1)
	}

	eachArrowFn() {
		this.prop.forEach(v => {v.value += 1})
	}

	eachFn() {
		this.prop.forEach(function(v){v.value += 1})
	}
}


export class TestArrayElementsSet extends Component {

	list: number[] = []

	setAtIndex() {
		this.list[0] = 1
	}

	toggleElementSet(item: number) {
		if (this.list.includes(item)) {
			this.list.splice(this.list.indexOf(item), 1)
		}
		else {
			this.list.push(item)
		}
	}

	elementAssignment(item: number) {
		if (this.list.includes(item)) {
			this.list.splice(this.list.indexOf(item), 1)
		}
		else {
			this.list = [item]
		}
	}
}


/** Optional Array mutations must retain their results and evaluation order. */
export class TestOptionalArrayWrite {

	/** Track a push only when the receiver is present. */
	push(list: Observed<number[]> | undefined) {
		return list?.push(1)
	}

	/** Skip a computed argument when the list is absent. */
	pushArgument(list: Observed<number[]> | undefined, value: () => number) {
		return list?.push(value())
	}

	/** Evaluate a computed receiver once and keep its argument guarded. */
	pushReceiver(read: () => Observed<number[]> | undefined, value: () => number) {
		return read()?.push(value())
	}

	/** Guard a zero-argument mutation for nullable receivers. */
	pop(list: Observed<number[]> | null) {
		return list?.pop()
	}

	/** Removing the first element is also a collection mutation. */
	shift(list: Observed<number[]> | undefined) {
		return list?.shift()
	}

	/** Reordering mutates the original collection while returning it. */
	reverse(list: Observed<number[]> | undefined) {
		return list?.reverse()
	}

	/** Replacing element values is a mutation, not a collection read. */
	fill(list: Observed<number[]> | undefined) {
		return list?.fill(3)
	}

	/** Copying within the same collection must emit set tracking. */
	copyWithin(list: Observed<number[]> | undefined) {
		return list?.copyWithin(0, 1)
	}
}
