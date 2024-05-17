import * as L from '@pucelle/lupos.js'
import {Component, TemplateResult} from '@pucelle/lupos.js'


class TestTemplateResult extends L.Component {

	render(): L.TemplateResult {
		return null as any
	}
}


class TestTemplateResultArray extends Component {

	render(): TemplateResult[] {
		return null as any
	}
}


class TestText extends Component {

	render(): string {
		return ''
	}
}


class TestUnionTypes extends Component {

	render(): TemplateResult | string {
		return null as any
	}
}