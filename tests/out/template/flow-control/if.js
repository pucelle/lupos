import { Component, CompiledTemplateResult, TemplateMaker, SlotPosition, IfBlock, TemplateSlot, HTMLMaker } from '@pucelle/lupos.js';
import { trackGet } from "@pucelle/ff";
const $html_0 = new HTMLMaker(" <!---->");
/*
<root>
    ${this.content!}
    <lu:if ${this.prop!} />
</root>
*/ const $template_0 = new TemplateMaker(function ($context) {
    let $latest_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.lastChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), $context);
    let $block_0 = new IfBlock($slot_0);
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($latest_0 !== this.content) {
                $node_0.data = $latest_0 = this.content;
            }
            $block_0.update($values[1]);
        },
        parts: [[$slot_0, 0]]
    };
});
const $html_1 = new HTMLMaker(" ");
/*
<root>${this.content!}</root>
*/ const $template_1 = new TemplateMaker(function () {
    let $latest_0;
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update() {
            if ($latest_0 !== this.content) {
                $node_0.data = $latest_0 = this.content;
            }
        }
    };
});
class TestIf extends Component {
    prop = 1;
    content = '';
    // testIf() {
    // 	return html`
    // 		<lu:if ${this.prop}>If Content</lu:if>
    // 	`
    // }
    // testIfCacheable() {
    // 	return html`
    // 		<lu:if ${this.prop} cache>If Content</lu:if>
    // 	`
    // }
    testDynamicIfContent() {
        trackGet(this, "content", "prop");
        return new CompiledTemplateResult($template_0, [
            this.content,
            this.prop ? new CompiledTemplateResult($template_1, [
                this.content!
            ]) : null
        ]);
    }
}
