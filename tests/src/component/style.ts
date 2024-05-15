import {observable} from '@pucelle/ff'
import {Component, addGlobalStyle, css} from '@pucelle/lupos.js'


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


addGlobalStyle(css`.a{
	.b{
		color: red;
	}
}`)


@observable
class O {
	color: string = 'red'
}

let o = new O()

addGlobalStyle(() => {
	return css`.a{
		.b{
			color: ${o.color};
		}
	}`
})