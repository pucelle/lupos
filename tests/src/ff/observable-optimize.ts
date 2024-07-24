import {Observed} from '@pucelle/ff'
import {Component} from '@pucelle/lupos.js'


class TestOptimizing extends Component {

	prop: {value: number} = {value: 1}

	moveConditionalConditionOutward() {
		if (this.prop) {}

		return ''
	}

	moveConditionalConditionOutwardInterrupted() {
		if (this.prop) {
			return
		}

		return ''
	}

	eliminateOwnRepetitiveAfterReturn() {
		this.prop

		if (1) {
			return
		}

		this.prop

		return ''
	}

	*persistOwnRepetitiveAfterYield() {
		this.prop
		yield 0
		this.prop
	}

	async persistOwnRepetitiveAfterAwait() {
		this.prop
		await Promise.resolve()
		this.prop

		return ''
	}

	eliminateRepetitiveProp() {
		this.prop

		if (1) {
			this.prop
		}

		return ''
	}

	eliminateRepetitivePropAfterReturn() {
		if (1) {
			return ''
		}

		this.prop

		if (1) {
			return this.prop
		}

		return ''
	}

	mergeAllIfElseBranches() {
		if (1) {
			this.prop
		}
		else if (1) {
			this.prop
		}
		else {
			this.prop
		}

		return ''
	}

	mergeAllConditionalBranches() {
		1 ? this.prop : this.prop

		return ''
	}

	mergeAllBinaryBranches() {
		this.prop && this.prop || this.prop

		return ''
	}

	avoidEliminatingSameNameButDifferentVariable() {
		let prop: Observed<{value: number}> = {value: 1}
		prop.value
		
		if (1) {
			let prop: Observed<{value: number}> = {value: 2}
			prop.value
		}

		return ''
	}

	moveIterationInitializerOutward() {
		for (let i = this.prop.value; i < 1; i++) {}

		return ''
	}

	moveInternalReturnedIterationInitializerOutward() {
		for (let i = this.prop.value; i < 1; i++) {
			return
		}

		return ''
	}

	moveIterationConditionOutward() {
		for (let i = 0; i < this.prop.value; i++) {}

		return ''
	}

	preventMoveIterationConditionOutward() {
		let props: Observed<{value: number}[]> = [this.prop, this.prop]

		for (let i = 0; i < props[i].value; i++) {}

		return ''
	}

	moveIterationIncreasementOutward() {
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
		let props: Observed<{value: number}[]> = [this.prop, this.prop]

		for (let i = 0; i < 1; i++){
			props[i].value
		}

		return ''
	}
}
