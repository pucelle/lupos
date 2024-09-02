import { Component, html, TemplateMaker, SlotPosition, KeyedBlock, TemplateSlot, HTMLMaker } from '@pucelle/lupos.js';
import { trackGet } from "@pucelle/ff";
const $html_0 = new HTMLMaker("<!----><!---->");
const $template_0 = new TemplateMaker($context => {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.lastChild;
    $block_0 = new KeyedBlock($template_1, new TemplateSlot(new SlotPosition(2, $node_1), $context), $context);
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        update($values) {
            $block_0.update($values[0], $values);
        }
    };
});
const $html_1 = new HTMLMaker("Keyed Content");
const $template_1 = new TemplateMaker($context => {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0)
    };
});
class TestKeyed extends Component {
    key = 1;
    testKeyed() {
        trackGet(this, "key");
        return new CompiledTemplateResult($template_0, [this.key]);
    }
}
