import { Component, addGlobalStyle, css, ensureComponentStyle } from '@pucelle/lupos.js';
class TestNormalStyle extends Component {
    static style = css `.a{}.a .b{color:red;}`;
}
TestNormalStyle.ensureStyle();
class TestDynamicStyle extends Component {
    static style() {
        return css `.a{}.a .b{color:red;}`;
    }
}
TestDynamicStyle.ensureStyle();
class TestDynamicStyleWithValues extends Component {
    static style() {
        return css `.a{color:${"red"};}.a .b{color:${"green"};}`;
    }
}
TestDynamicStyleWithValues.ensureStyle();
class TestClassNameInterpolated extends Component {
    static style() {
        let type = '';
        let color = '';
        return css `.a.type-${type}{}.a.type-${type} .b{background:${color};}`;
    }
}
TestClassNameInterpolated.ensureStyle();
addGlobalStyle(css `.a{}.a .b{color:red;}`);
