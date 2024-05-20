import {DeepReadonly, Observed} from '@pucelle/ff'
import {Component} from '@pucelle/lupos.js'


class TestObservedVariableType {

	render() {
		var a = {value:1} as Observed<{value: number}>
   		var b: Observed<{value: number}> = {value:1}
		var c = b

		return a.value
			+ b.value
			+ c.value
	}
}



class TestObservedParameters {

	prop: {value: number} = {value:1}

	renderProp1(this: Observed<TestObservedParameters>) {
		return this.prop.value
	}

	renderProp2() {
		return (this.prop as Observed<{value: number}>).value
	}

	renderProp3(item: Observed<{value: number}>) {
		return item.value
	}
}



class TestNormalProp extends Component {

	prop: string =  'Text'

	render() {
		return this.prop
	}
}



class TestElementProp extends Component {

	prop: string =  'Text'

	render() {
		let prop = 'prop' as 'prop'

		return this['prop']
			+ this[prop]
	}
}



class TestObjectProp extends Component {

	prop = {value: 'Text'}

	render() {
		return this.prop.value
	}
}



class TestRepetitiveProp extends Component {

	prop = {value: 'Text'}

	render() {
		return this.prop.value
			+ this.prop.value
			+ this.prop["value"]
			+ this.prop['value']
	}
}



class TestGroupedProp extends Component {

	prop1 = {value1: 'Text', value2: 'Text'}
	prop2 = {value: 'Text'}

	render() {
		return this.prop1.value1
			+ this.prop1.value2
			+ this.prop2.value
	}
}


class TestIfBlock extends Component {

	prop: string | undefined = undefined

	render() {
		if (this.prop)
			return this.prop
		else
			return ''
	}
}



class TestSwitchBlock extends Component {

	prop: string = 'Text'

	render() {
		let cond = '1'
		switch (cond) {
			case '1': return this.prop
			case '2': return this.prop
		}

		return ''
	}
}



class TestForBlock extends Component {

	prop: number = 1

	render() {
		for (let i = 0; i < 10; i++) this.prop
		return ''
	}
}


class TestWhileBlock extends Component {

	prop: number = 1

	render() {
		let i = 0
		while (i < 10) this.prop
		return ''
	}
}



class TestBreakStatement extends Component {

	prop1: number = 0
	prop2: number = 0

	render() {
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

	render() {
		for (let i = 0; i < 10; i++) {
			if (this.prop1)
			continue
			this.prop2
		}

		return ''
	}
}



class TestTernaryConditionalOperator extends Component {

	prop: {value: string} | undefined = undefined

	render() {
		return this.prop ? this.prop.value : ''
	}
}



class TestQuestionDotPropMerge extends Component {

	prop: {value: 'Text'} | undefined = undefined

	render() {
		return '' + this.prop?.value
			+ this.prop?.['value']
	}
}



class TestIgnoringMethod extends Component {

	render() {
		return this.renderMore()
	}

	renderMore() {
		return ''
	}
}



interface MethodSignature {
	property: () => string
	method(): string
}

class TestIgnoringMethodSignature extends Component {

	member: Observed<MethodSignature> = {property: () => '', method(){return ''}}

	render() {
		return this.member.property() + this.member.method()
	}
}



class TestObservedPropRenderFn extends Component {

	prop = {value: 'Text'}

	render() {
		return this.renderProp(this.prop)
	}

	renderProp(prop: Observed<{value: string}>) {
		return prop.value
	}
}



class TestArrayProp extends Component {

	prop: {value: number}[] = [{value:1}]

	render() {
		return this.prop[0].value + ''
	}
}



type ArrayProp = {value: number}[]
type ArrayPropAlias = ArrayProp

class TestAliasArrayTypeOfProp extends Component {

	prop: ArrayPropAlias = [{value:1}]

	render() {
		return this.prop[0].value + ''
	}
}



class TestArrayMapFn {

	prop: {value: number}[] = [{value:1}]

	render1() {
		return this.prop.map((v: Observed<{value: number}>) => v.value).join('')
	}

	render2() {
		return this.prop.map((v: Observed<{value: number}>) => {return v.value}).join('')
	}

	render3() {
		return this.prop.map(function(v: Observed<{value: number}>){return v.value}).join('')
	}
}



class TestArrayBroadcastingObservedToMapFn extends Component {

	prop: {value: number}[] = [{value:1}]

	render1() {
		return this.prop.map(v => v.value).join('')
	}

	render2() {
		return this.prop.map(v => {return v.value}).join('')
	}

	render3() {
		return this.prop.map(function(v){return v.value}).join('')
	}
}



class TestLiftingPropInArrayMapFn extends Component {

	prop1: {value: number}[] = [{value:1}]
	prop2: number = 2

	render() {
		let c: Observed<{value: number}> = {value: 3}
		return this.prop1.map(v => v.value + this.prop2 + c.value).join('')
	}
}



class TestNonPlainObjectProp extends Component {

	prop: Map<number, number> = new Map([[1, 2]])

	render() {
		return this.prop.get(1)! + ''
	}
}



interface ReadonlyProp {
	readonly value: string
}

class TestReadonlyModifier extends Component {

	readonly prop1: {value: string} = {value: 'Text'}
	prop2: ReadonlyProp = {value: 'Text'}

	render() {
		return this.prop1.value
			+ this.prop2.value
	}
}



class TestReadonlyProp extends Component {

	prop: Readonly<{value: string}> = {value: 'Text'}

	render() {
		return this.prop.value
	}
}



class TestReadonlyArrayProp extends Component {

	prop: ReadonlyArray<{value: string}> = [{value: 'Text1'}]

	render() {
		return this.prop.map(item => item.value).join(' ')
	}
}



class TestDeepReadonlyProp extends Component {

	prop: DeepReadonly<{value: {value: string}}> = {value: {value: 'Text'}}

	render() {
		return this.prop.value.value
	}
}



class TestDeepReadonlyArrayProp extends Component {

	prop: DeepReadonly<{value: string}[]> = [{value: 'Text1'}]

	render() {
		return this.prop.map(item => item.value).join(' ')
	}
}
