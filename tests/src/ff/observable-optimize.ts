import {Observed} from '@pucelle/ff'
import {Component} from '@pucelle/lupos.js'


class TestOptimizing extends Component {

	prop: {value: number} = {value: 1}

	moveConditionalConditionOutward() {
		if (this.prop) {}

		return 0
	}

	moveConditionalConditionOutwardInterrupted() {
		if (this.prop) {
			return
		}

		return 0
	}

	eliminateOwnRepetitiveAfterReturn() {
		this.prop

		if (1) {
			return
		}

		this.prop

		return 0
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

		return 0
	}

	eliminateRepetitiveProp() {
		this.prop

		if (1) {
			this.prop
		}

		return 0
	}

	eliminateRepetitivePropAfterReturn() {
		if (1) {
			return 0
		}

		this.prop

		if (1) {
			return this.prop
		}

		return 0
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

		return 0
	}

	preventMergeIfOnlyBranch() {
		if (1) {
			this.prop
		}

		return 0
	}

	mergeAllSwitchCaseBranches() {
		var a: string = ''

        switch (a) {
            case '1':
            	this.prop
				break;

            case '2':
        		this.prop
				break;

			default:
				this.prop
        }

        return 0
    }

	mergeNoDefaultSwitchCaseBranches() {
		var a: string = ''

        switch (a) {
            case '1':
            	this.prop
				break;

            case '2':
        		this.prop
				break;
        }

        return 0;
    }

	mergeReturnedSwitchCaseBranches() {
		var a: string = ''
		
		switch (a) {
			case '1': return this.prop
			case '2': return this.prop
		}

		return 0
	}

	mergeAllConditionalBranches() {
		1 ? this.prop : this.prop

		return 0
	}

	mergeAllBinaryBranches() {
		this.prop && this.prop || this.prop

		return 0
	}

	avoidEliminatingSameNameButDifferentVariable() {
		let prop: Observed<{value: number}> = {value: 1}
		prop.value
		
		if (1) {
			let prop: Observed<{value: number}> = {value: 2}
			prop.value
		}

		return 0
	}

	moveIterationInitializerOutward() {
		for (let i = this.prop.value; i < 1; i++) {}

		return 0
	}

	moveInternalReturnedIterationInitializerOutward() {
		for (let i = this.prop.value; i < 1; i++) {
			return
		}

		return 0
	}

	moveIterationConditionOutward() {
		for (let i = 0; i < this.prop.value; i++) {}

		return 0
	}

	preventMoveIterationConditionOutward() {
		let props: Observed<{value: number}[]> = [this.prop, this.prop]

		for (let i = 0; i < props[i].value; i++) {}

		return 0
	}

	moveIterationIncreasementOutward() {
		for (let i = 0; i < 1; i+=this.prop.value) {}

		return 0
	}

	moveForIterationContentTrackingOuter() {
		for (let i = 0; i < 1; i++){
			this.prop.value
		}

		return 0
	}

	moveWhileIterationContentTrackingOuter() {
		let index = 0
		while (index < 1) {
			this.prop.value
		}

		return 0
	}

	preventMovingIterationContentWhenIncludesLocalVariables() {
		let props: Observed<{value: number}[]> = [this.prop, this.prop]

		for (let i = 0; i < 1; i++){
			props[i].value
		}

		return 0
	}
}
