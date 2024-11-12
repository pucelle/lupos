import {Observed} from '@pucelle/ff'
import {Component} from '@pucelle/lupos.js'


export class TestIfStatement extends Component {

	prop1: number = 0
	prop2: number = 0

	testIf() {
		if (this.prop1)
			this.prop1
		else if (this.prop2)
			this.prop2
		else
			0

		return 0
	}

	testIfReturned() {
		if (this.prop1)
			return this.prop1
		else if (this.prop2)
			return this.prop2
		else
			return 0
	}
}


export class TestSwitchBlock extends Component {

	cond: string = '1'
	case1: string = '1'
	case2: string = '2'
	prop: string = 'Text'

	fixedCond() {
		let cond = '1'
		switch (cond) {
			case '1': return this.prop
			case '2': return this.prop
		}

		return 0
	}

	variableCond() {
		switch (this.cond) {
			case '1': return this.prop
			case '2': return this.prop
		}

		return 0
	}

	variableCase() {
		switch (this.cond) {
			case this.case1: return this.prop
			case this.case2: return this.prop
		}

		return 0
	}
}


export class TestForBlock extends Component {

	prop: number = 1

	testFor() {
		for (let i = 0; i < 10; i++)
			this.prop

		return 0
	}

	testForInitializer() {
		for (let i = this.prop; i < 1; i++) {
			this.prop
		}

		return 0
	}

	testForOfItems() {
		let list: Observed<{value: number}[]> = [{value: 1}]

		for (let item of list) {
			item.value = 1
		}

		for (let item of this.getList()) {
			item.prop = 1
		}

		for (let item of this.list) {
			item.prop = 1
		}
	}

	getList(): TestForBlock[] {
		return [this]
	}

	get list(): TestForBlock[] {
		return [this]
	}


	testForCondition() {
		for (let i = 0; i < this.prop; i++) {
			this.prop
		}

		return 0
	}

	testForIncreasement() {
		for (let i = 0; i < this.prop; i++) {
			this.prop
		}

		return 0
	}
}



export class TestWhileBlock extends Component {

	prop: number = 1

	testWhile() {
		let i = 0
		while (i < 10) this.prop
		return 0
	}
}


export class TestDoWhileBlock extends Component {

	prop: number = 1

	testDoWhile() {
		let i = 0
		do {this.prop} while (i < 10)
		return 0
	}
}


export class TestBreakStatement extends Component {

	prop1: number = 0
	prop2: number = 0

	testBreak() {
		for (let i = 0; i < 10; i++) {
			if (this.prop1)
			break
			this.prop2
		}

		return 0
	}
}


export class TestContinueStatement extends Component {

	prop1: number = 0
	prop2: number = 0

	testContinue() {
		for (let i = 0; i < 10; i++) {
			if (this.prop1)
			continue
			this.prop2
		}

		return 0
	}
}


export class TestAwaitStatement extends Component {

	prop1: number = 1
	prop2: number = 2

	async testAwaitTrackSplicing() {
		this.prop1
		await Promise.resolve()
		this.prop2
		return 0
	}

	async testAwaitVariableTracking() {
		let prop = await this.asyncGetProp(this.prop1)
		return prop
	}

	async asyncGetProp(prop: number) {
		return prop
	}
}


export class TestYieldStatement extends Component {

	prop1: number = 1;
	prop2: number = 2;

	*testYield() {
		this.prop1
		yield 1
		this.prop2
	}
}
