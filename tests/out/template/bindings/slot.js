import { Component, html, SlotBinding, TemplateMaker, SlotPosition, HTMLMaker } from '@pucelle/lupos.js';
const $html_0 = new HTMLMaker("<div></div>");
const $template_0 = new TemplateMaker($context => {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new SlotBinding($node_0);
    $binding_0.update("slotName");
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        parts: [$binding_0]
    };
});
class TestSlotBinding extends Component {
    testSlot() {
        return new CompiledTemplateResult($template_0, []);
    }
}
