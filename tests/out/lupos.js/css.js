import { Component, addGlobalStyle, css, addComponentStyle } from '@pucelle/lupos.js';
export class TestNormalStyle extends Component {
    static style = /*#__PURE__*/ addComponentStyle(".a{.b{color:red;}}", "TestNormalStyle");
}
export class TestDynamicStyle extends Component {
    static style = /*#__PURE__*/ addComponentStyle(() => {
        return ".a{.b{color:red;}}";
    }, "TestDynamicStyle");
}
export class TestDynamicStyleWithValues extends Component {
    static style = /*#__PURE__*/ addComponentStyle(() => {
        return css([".a{color:", ";.b{color:", ";}}"], ["red", "green"]);
    }, "TestDynamicStyleWithValues");
}
export class TestClassNameInterpolated extends Component {
    static style = /*#__PURE__*/ addComponentStyle(() => {
        let type = '';
        let color = '';
        return css([".a.type-", "{.b{background:", ";}}"], [type, color]);
    }, "TestClassNameInterpolated");
}
export class TestCodesInterpolated extends Component {
    static style = /*#__PURE__*/ addComponentStyle(() => {
        let code1 = '';
        let code2 = '';
        return css(["", ".a{background:red;}", ""], [code1, code2]);
    }, "TestCodesInterpolated");
}
addGlobalStyle(".a{.b{color:red;}}");
