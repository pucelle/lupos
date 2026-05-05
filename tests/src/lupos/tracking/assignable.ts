import {Component, html} from 'lupos.html'


class Com<T extends string> extends Component {
	prop!: {
		a: T
		b: any[]
	}
}


/** Only ensure the compiling can pass  */
export class Ref extends Component {
	protected override render() {
		return html`
			<Com
				.prop=${{a: '1', b: [1]}}
			/>
		`
	}
}