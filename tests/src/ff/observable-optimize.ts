import {Observed} from '@pucelle/ff'
import {Component} from '@pucelle/lupos.js'


class TestOptimizing extends Component {

	prop: {value: number} = {value: 1}

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
		for (let i = this.prop.value; i < 1; i++) {}

		return ''
	}

	moveIterationConditionForward() {
		for (let i = 0; i < this.prop.value; i++) {}

		return ''
	}

	moveIterationIncreasementForward() {
		for (let i = 0; i < 1; i+=this.prop.value) {}

		return ''
	}

	moveForIterationContentTrackingOuter() {
		for (let i = 0; i < 1; i++){
			this.prop.value
		}

		return ''
	}

	moveWhileIterationContentTrackingOuter() {
		let index = 0
		while (index < 1) {
			this.prop.value
		}

		return ''
	}

	preventMovingIterationContentWhenIncludesLocalVariables() {
		let prop: Observed<{value: number}[]> = [this.prop, this.prop]

		for (let i = 0; i < 1; i++){
			prop[i].value
		}

		return ''
	}
}
