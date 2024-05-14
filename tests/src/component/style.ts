import {Component, TemplateResult, css} from '@pucelle/lupos.js'


class C1 extends Component {

	static style = css`
		.a{
			.b{
				color: red;
			}
		}
	`
}


class C2 extends Component {

	static style() {
		return css`
			.a{
				.b{
					color: red;
				}
			}
		`
	}
}


class C3 extends Component {

	static style() {
		return css`
			.a{
				color: ${"red"};

				.b{
					color: ${"green"};
				}
			}
		`
	}
}