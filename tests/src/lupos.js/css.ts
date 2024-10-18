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



addGlobalStyle(css`.a{
	.b{
		color: red;
	}
}`)
