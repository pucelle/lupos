import { Component, addGlobalStyle, css } from '@pucelle/lupos.js';
class TestNormalStyle extends Component {
    static style = css `
		.a{
			.b{
				color: red;
			}
		}
	`;
}
class TestDynamicStyle extends Component {
    static style() {
        return css `
			.a{
				.b{
					color: red;
				}
			}
		`;
    }
}
class TestDynamicStyleWithValues extends Component {
    static style() {
        return css `
			.a{
				color: ${"red"};

				.b{
					color: ${"green"};
				}
			}
		`;
    }
}
addGlobalStyle(css `.a{
	.b{
		color: red;
	}
}`);
