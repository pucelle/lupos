import {Component, TemplateResult} from 'lupos.html'


export class TestTemplateResult extends Component {

	render(): TemplateResult {
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