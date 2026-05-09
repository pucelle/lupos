import { Component, TemplateSlot, SlotPosition, CompiledTemplateResult, TemplateMaker, HTMLMaker, KeyedBlock } from 'lupos.html';
import { trackGet } from "lupos";
const $html_0 = /*#__PURE__*/ new HTMLMaker("<!----><!--5592a1-->");
/*
<root>
    <lu:keyed ${this.key} />
</root>
*/ const $template_0 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_0.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.getMarker("5592a1");
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), 0, $locator.getNodes("5592a1"));
    let $block_0 = new KeyedBlock($slot_0);
    return {
        el: $locator.el,
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
*/ const $template_1 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_1.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
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
