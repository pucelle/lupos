import { Component, html, CompiledTemplateResult, TemplateMaker, SlotPosition, HTMLMaker, ForBlock, TemplateSlot } from '@pucelle/lupos.js';
import { trackGet } from "@pucelle/ff";
const $html_0 = new HTMLMaker(" ");
/*
<root>${n + prop}</root>
*/ const $template_0 = new TemplateMaker($context => {
    let $latest_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $node_0.data = $latest_0 = $values[0];
            }
        }
    };
});
const $html_1 = new HTMLMaker("<!----><!---->");
/*
<root>
    <lupos:for ${[1,2,3]} />
</root>
*/ const $template_1 = new TemplateMaker($context => {
    let $latestValues;
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.lastChild;
    $block_0 = new ForBlock((n) => new CompiledTemplateResult($template_0, [n + $latestValues[0]]), new TemplateSlot(new SlotPosition(2, $node_1), $context));
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        update($values) {
            $latestValues = $values;
            $block_0.update([1, 2, 3]);
        }
    };
});
class TestFor extends Component {
    prop = 1;
    // renderItem(n: number) {
    // 	return html`${n + this.prop}`
    // }
    // testForMapFn() {
    // 	return html`
    // 		<lupos:for ${[1,2,3]}>${this.renderItem}</lupos:for>
    // 	`
    // }
    // testForLocalMapFn() {
    // 	return html`
    // 		<lupos:for ${[1,2,3]}>${(n: number) => html`
    // 			${n + this.prop}
    // 		`}</lupos:for>
    // 	`
    // }
    testForLocalVariableTransferring() {
        let prop = this.prop;
        trackGet(this, "prop");
        return new CompiledTemplateResult($template_1, [prop]);
    }
}
