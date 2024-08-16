import { Component, html, TemplateMaker, SlotPosition, HTMLMaker, TemplateSlot } from '@pucelle/lupos.js';
const $html_0 = new HTMLMaker("<div></div>");
const $template_0 = new TemplateMaker($context => {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0)
    };
});
const $template_1 = new TemplateMaker($context => {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_0), $context, 0);
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        update($values) {
            $slot_0.update(html `<div></div>`);
        },
        parts: [$slot_0]
    };
});
class TestContent extends Component {
    prop = 1;
    testTemplateResult() {
        return new CompiledTemplateResult($template_1, []);
    }
}
