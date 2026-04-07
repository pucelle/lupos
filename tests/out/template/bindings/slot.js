import { Component, SlotBinding, CompiledTemplateResult, TemplateMaker, SlotPosition, HTMLMaker } from 'lupos.html';
const $html_0 = /*#__PURE__*/ new HTMLMaker("<!----><div></div>");
/*
<root>
    <div :slot="slotName" />
</root>
*/ const $template_0 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_0.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.childAt(1);
    let $binding_0 = new SlotBinding($node_1);
    $binding_0.update("slotName");
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        parts: [
            [$binding_0, 1]
        ]
    };
});
export class TestSlotBinding extends Component {
    testSlot() {
        return new CompiledTemplateResult($template_0, [], this);
    }
}
