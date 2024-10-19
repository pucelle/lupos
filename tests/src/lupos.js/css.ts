import {Component, addGlobalStyle, css} from '@pucelle/lupos.js'


class TestNormalStyle extends Component {

	static style = css`
		.a{
			.b{
				color: red;
			}
		}
	`
}


class TestDynamicStyle extends Component {

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


class TestDynamicStyleWithValues extends Component {

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


class TestClassNameInterpolated extends Component {

	static style() {
		let type = ''
		let color = ''

		return css`
			.a.type-${type}{
				.b{
					background: ${color};
				}
			}
			`
	}
}


class TestCodesInterpolated extends Component {

	static style() {
		let code1 = ''
		let code2 = ''

		return css`
			${code1}
			.a{
				background: red;
			}
			${code2}
			`
	}
}


addGlobalStyle(css`.a{
	.b{
		color: red;
	}
}`)
