import { Component, TemplateSlot, SlotPosition, CompiledTemplateResult, TemplateMaker, HTMLMaker, KeyedBlock } from '@pucelle/lupos.js';
import { trackGet } from "@pucelle/lupos";
const $html_0 = /*#__PURE__*/ new HTMLMaker("<!----><!---->");
/*
<root>
    <lu:keyed ${this.key} />
</root>
*/ const $template_0 = /*#__PURE__*/ new TemplateMaker(function () {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.lastChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), 0);
    let $block_0 = new KeyedBlock($slot_0);
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            $block_0.update($values[0], $values[1]);
        },
        parts: [
            [$slot_0, 1]
        ]
    };
});
const $html_1 = /*#__PURE__*/ new HTMLMaker("Keyed Content");
/*
<root>Keyed Content</root>
*/ const $template_1 = /*#__PURE__*/ new TemplateMaker(function () {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
export class TestKeyed extends Component {
    key = 1;
    testKeyed() {
        trackGet(this, "key");
        return new CompiledTemplateResult($template_0, [
            this.key,
            new CompiledTemplateResult($template_1, [], this)
        ], this);
    }
}
