import {Observed} from '@pucelle/ff'
import {Component} from '@pucelle/lupos.js'


class TestOptimizing extends Component {

	prop: {value: number}[] = [{value: 1}, {value: 2}]

	eliminateChildProp() {
		this.prop
		if (true) {
			this.prop
		}

		return ''
	}

	eliminateChildVariable() {
		let prop: Observed<{value: number}> = {value: 1}
		prop.value

		if (true) {
			prop.value
		}

		return ''
	}

	avoidEliminatingSameNameButDifferentVariable() {
		let prop: Observed<{value: number}> = {value: 1}
		prop.value
		
		if (true) {
			let prop: Observed<{value: number}> = {value: 2}
			prop.value
		}

		return ''
	}

	moveConditionalConditionForward() {
		if (this.prop) {}

		return ''
	}

	moveIterationInitializerForward() {
		for (let i = this.prop[0].value; i < 1; i++) {}

		return ''
	}

	moveIterationConditionForward() {
		for (let i = 0; i < this.prop[0].value; i++) {}

		return ''
	}

	moveIterationIncreasementForward() {
		for (let i = 0; i < 1; i+=this.prop[0].value) {}

		return ''
	}

	moveForIterationContentTrackingOuter() {
		for (let i = 0; i < 1; i++){
			this.prop[i].value
		}

		return ''
	}

	moveWhileIterationContentTrackingOuter() {
		let index = 0
		while (index < 1) {
			this.prop[index++].value
		}

		return ''
	}

	dynamicVariableAsIndex() {
		let index = 0

		this.prop[index].value
		index++
		this.prop[index].value

		return ''
	}

	dynamicIndexChangeOtherWhere() {
		let index = {value: 0}

		this.prop[index.value].value
		index.value++
		this.prop[index.value].value
		
		return ''
	}

	dynamicExp() {
		let a = this.prop[0]
		a.value = 1

		a = this.prop[1]
		a.value = 2
	}

	dynamicExpAndIndexParam() {
		let index = 0
		let a = this.getItem(index++)
		a.value = 1

		a = this.getItem(index++)
		a.value = 2
	}

	getItem(index: number): Observed<{value: number}> {
		return this.prop[index]
	}
}


