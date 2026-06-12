import { Component, TemplateSlot, SlotPosition, CompiledTemplateResult, TemplateMaker, CacheBlock, HTMLMaker } from 'lupos.html';
const $html_0 = /*#__PURE__*/ new HTMLMaker("<!----><!--3abcdc-->");
/*
<root>
    <lu:cache />
</root>
*/ const $template_0 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_0.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.getMarker("3abcdc");
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), 0, $locator.getNodes("3abcdc"));
    let $block_0 = new CacheBlock($slot_0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        update($values) {
            $block_0.update($values[0]);
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
export class TestCache extends Component {
    testCache() {
        return new CompiledTemplateResult($template_0, [
            this.renderCacheContent()
        ], this);
    }
    renderCacheContent() {
        return new CompiledTemplateResult($template_1, [], this);
    }
}
