import { Component, SlotBinding, CompiledTemplateResult, TemplateMaker, SlotPosition, HTMLMaker } from '@pucelle/lupos.js';
const $html_0 = /*#__PURE__*/ new HTMLMaker("<!----><div></div>");
/*
<root>
    <div :slot="slotName" />
</root>
*/ const $template_0 = /*#__PURE__*/ new TemplateMaker(function () {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.lastChild;
    let $binding_0 = new SlotBinding($node_1);
    $binding_0.update("slotName");
    return {
        el: $node,
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
