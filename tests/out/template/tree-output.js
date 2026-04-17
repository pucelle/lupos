import { Component, CompiledTemplateResult, TemplateMaker, SlotPosition, HTMLMaker } from 'lupos.html';
const $html_0 = /*#__PURE__*/ new HTMLMaker("");
/*
<root>
    <template class="className" />
</root>
*/ const $template_0 = /*#__PURE__*/ new TemplateMaker(function ($context, $hydrates) {
    let $locator = $html_0.make($hydrates);
    let $node_0 = $context.el;
    $node_0.classList.add("className");
    return {
        el: $locator.el,
        position: new SlotPosition(0, $node_0)
    };
});
const $html_1 = /*#__PURE__*/ new HTMLMaker("<svg><path></path></svg>", true);
/*
<root>
    <svg>
        <path />
    </svg>
</root>
*/ const $template_1 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_1.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_2 = /*#__PURE__*/ new HTMLMaker("<div com></div>");
export class TestTemplateOutput extends Component {
    prop = 1;
    readonlyProp = 1;
    testTemplate() {
        return new CompiledTemplateResult($template_0, [], this);
    }
    testSVG() {
        return new CompiledTemplateResult($template_1, [], this);
    }
    testLocalReference() {
        /*
        <root>
            <Child />
        </root>
        */ const $template_2 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
            let $locator = $html_2.make($hydrates);
            let $node_0 = $locator.childAt(0);
            let $com_0 = new Child($node_0);
            return {
                el: $locator.el,
                position: new SlotPosition(1, $node_0),
                parts: [
                    [$com_0, 1]
                ]
            };
        });
        class Child extends Component {
        }
        return new CompiledTemplateResult($template_2, [], this);
    }
}
