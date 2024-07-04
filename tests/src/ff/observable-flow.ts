import {Component} from '@pucelle/lupos.js'


class TestIfStatement extends Component {

	prop1: string = ''
	prop2: string = ''

	testIf() {
		if (this.prop1)
			return this.prop1
		else if (this.prop2)
			return this.prop2
		else
			return ''
	}
}


class TestSwitchBlock extends Component {

	cond: string = '1'
	prop: string = 'Text'

	fixedCond() {
		let cond = '1'
		switch (cond) {
			case '1': return this.prop
			case '2': return this.prop
		}

		return ''
	}

	variableCond() {
		switch (this.cond) {
			case '1': return this.prop
			case '2': return this.prop
		}

		return ''
	}
}


class TestForBlock extends Component {

	prop: number = 1

	testFor() {
		for (let i = 0; i < 10; i++)
			this.prop
		return ''
	}
}


class TestWhileBlock extends Component {

	prop: number = 1

	testWhile() {
		let i = 0
		while (i < 10) this.prop
		return ''
	}
}


class TestDoWhileBlock extends Component {

	prop: number = 1

	testDoWhile() {
		let i = 0
		do {this.prop} while (i < 10)
		return ''
	}
}


class TestBreakStatement extends Component {

	prop1: number = 0
	prop2: number = 0

	testBreak() {
		for (let i = 0; i < 10; i++) {
			if (this.prop1)
			break
			this.prop2
		}

		return ''
	}
}


class TestContinueStatement extends Component {

	prop1: number = 0
	prop2: number = 0

	testContinue() {
		for (let i = 0; i < 10; i++) {
			if (this.prop1)
			continue
			this.prop2
		}

		return ''
	}
}


class TestAwaitStatement extends Component {

	prop1: number = 1
	prop2: number = 2

	async testAwait() {
		this.prop1
		await Promise.resolve()
		this.prop2
	}
}



class TestYieldStatement extends Component {

	prop1: number = 1;
	prop2: number = 2;

	*testYield() {
		this.prop1
		yield 1
		this.prop2
	}
}
