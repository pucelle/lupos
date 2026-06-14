import { Component, PartDelegator, CompiledTemplateResult, TemplateMaker, SlotPosition, HTMLMaker } from 'lupos.html';
const $html_0 = /*#__PURE__*/ new HTMLMaker("<div></div>");
/*
<root>
    <div :custom=${1} />
</root>
*/ const $template_0 = /*#__PURE__*/ new TemplateMaker(function ($context, $hydrates) {
    let $locator = $html_0.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $binding_0 = new custom($node_0, $context, []);
    $binding_0.update(1);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        parts: [
            [$binding_0, 1]
        ]
    };
});
/*
<root>
    <div ?:custom=${true, 1} />
</root>
*/ const $template_1 = /*#__PURE__*/ new TemplateMaker(function ($context, $hydrates) {
    let $locator = $html_0.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $delegator_0 = new PartDelegator(() => new custom($node_0, $context, []));
    $delegator_0.update(true, 1);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        parts: [
            [$delegator_0, 1]
        ]
    };
});
export class TestCustomBinding extends Component {
    testCustom() {
        return new CompiledTemplateResult($template_0, [], this);
    }
    testPartialCustom() {
        return new CompiledTemplateResult($template_1, [], this);
    }
}
class custom {
    afterConnectCallback() {
    }
    beforeDisconnectCallback() {
    }
    update(_value) { }
}
