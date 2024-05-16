import * as L from '@pucelle/lupos.js'
import {Component, TemplateResult} from '@pucelle/lupos.js'


class C1 extends L.Component {

	render(): L.TemplateResult {
		return null as any
	}
}


class C2 extends Component {

	render(): TemplateResult[] {
		return null as any
	}
}


class C3 extends Component {

	render(): string {
		return ''
	}
}


class C4 extends Component {

	render(): TemplateResult | string {
		return null as any
	}
}