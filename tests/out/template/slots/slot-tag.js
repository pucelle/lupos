import { Component, CompiledTemplateResult, TemplateMaker, SlotPosition, HTMLMaker } from 'lupos.html';
const $html_0 = /*#__PURE__*/ new HTMLMaker("<div><slot></slot></div>");
/*
<root>
    <div>
        <slot />
    </div>
</root>
*/ const $template_0 = /*#__PURE__*/ new TemplateMaker(function ($context, $hydrates) {
    let $locator = $html_0.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $node_0.firstChild;
    $node_1.append(...$context.$getRestSlotNodes());
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_1 = /*#__PURE__*/ new HTMLMaker("<div com><!--bc5c3b--><div>Content</div></div>");
/*
<root>
    <ChildCom>
        <div>Content</div>
    </ChildCom>
</root>
*/ const $template_1 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_1.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.getMarker("bc5c3b");
    let $node_2 = $node_1.nextSibling;
    let $com_0 = new ChildCom($node_0);
    $com_0.$applyRestSlotRangeNodes($node_1, $node_2);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        parts: [
            [$com_0, 1]
        ]
    };
});
const $html_2 = /*#__PURE__*/ new HTMLMaker("<slot></slot>");
/*
<root>
    <slot />
</root>
*/ const $template_2 = /*#__PURE__*/ new TemplateMaker(function ($context, $hydrates) {
    let $locator = $html_2.make($hydrates);
    let $node_0 = $locator.childAt(0);
    $node_0.append(...$context.$getRestSlotNodes());
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
export class TestComponent extends Component {
    prop = 1;
    testRestSlot() {
        return new CompiledTemplateResult($template_0, [], this);
    }
    testRestSlotWithContent() {
        return new CompiledTemplateResult($template_1, [], this);
    }
}
class ChildCom extends Component {
    static SlotContentType = 0;
    render() {
        return new CompiledTemplateResult($template_2, [], this);
    }
}
