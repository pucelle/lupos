import * as L from '@pucelle/lupos.js'
import {Component, TemplateResult} from '@pucelle/lupos.js'


export class TestTemplateResult extends L.Component {

	render(): L.TemplateResult {
		return null as any
	}
}


export class TestTemplateResultList extends Component {

	render(): TemplateResult[] {
		return null as any
	}
}


export class TestText extends Component {

	render(): string {
		return ''
	}
}


export class TestUnionTypes extends Component {

	render(): TemplateResult | string {
		return null as any
	}
}