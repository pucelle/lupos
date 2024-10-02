import { Component, CompiledTemplateResult, TemplateMaker, SlotPosition, HTMLMaker, KeyedBlock, TemplateSlot } from '@pucelle/lupos.js';
import { trackGet } from "@pucelle/ff";
const $html_0 = new HTMLMaker("<!----><!---->");
/*
<root>
    <lu:keyed ${this.key} />
</root>
*/ const $template_0 = new TemplateMaker(function ($context) {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.lastChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), $context, 0);
    let $block_0 = new KeyedBlock($slot_0);
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            $block_0.update($values[0], $values[1]);
        },
        parts: [[$slot_0, 0]]
    };
});
const $html_1 = new HTMLMaker("Keyed Content");
/*
<root>Keyed Content</root>
*/ const $template_1 = new TemplateMaker(function () {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
class TestKeyed extends Component {
    key = 1;
    testKeyed() {
        trackGet(this, "key");
        return new CompiledTemplateResult($template_0, [this.key, new CompiledTemplateResult($template_1, [])]);
    }
}
