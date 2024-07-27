import { Component, addGlobalStyle, css } from '@pucelle/lupos.js';
class TestNormalStyle extends Component {
    static style = css `.a{}.a .b{color:red;}`;
}
class TestDynamicStyle extends Component {
    static style() {
        return css `.a{}.a .b{color:red;}`;
    }
}
class TestDynamicStyleWithValues extends Component {
    static style() {
        return css `.a{color:${"red"};}.a .b{color:${"green"};}`;
    }
}
addGlobalStyle(css `.a{}.a .b{color:red;}`);
