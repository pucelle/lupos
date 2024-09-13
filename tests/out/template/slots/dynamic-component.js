import { Component, CompiledTemplateResult, TemplateMaker, SlotPosition, DynamicComponentBlock, TemplateSlot, HTMLMaker } from '@pucelle/lupos.js';
import { trackSet, trackGet } from "@pucelle/ff";
const $html_0 = new HTMLMaker("<!----><div></div><!---->");
/*
<root>
    <${ChildComponent} .comProp=${this.prop} />
</root>
*/ const $template_0 = new TemplateMaker(function ($context) {
    let $latest_0, $com_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.childNodes[1];
    let $node_2 = $node.content.lastChild;
    let $block_0 = new DynamicComponentBlock(function (com) {
        $com_0 = com;
    }, $node_1, new TemplateSlot(new SlotPosition(1, $node_2), $context));
    $block_0.update(ChildComponent);
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $com_0.comProp = $latest_0 = $values[0];
                trackSet($com_0, "comProp");
            }
        },
        parts: () => [[$com_0, 0]]
    };
});
class TestDynamicComponent extends Component {
    prop = 1;
    // testNormal() {
    // 	return html`<${ChildComponent} />`
    // }
    // testChildContent() {
    // 	return html`<${ChildComponent}>Content</>`
    // }
    // testChildContentReference() {
    // 	return html`<${ChildComponent} :class=${'className'}><div :class=${'className'} /></>`
    // }
    // testStaticBinding() {
    // 	return html`<${ChildComponent} :class=${'className'} />`
    // }
    testDynamicProp() {
        trackGet(this, "prop");
        return new CompiledTemplateResult($template_0, [this.prop]);
    }
}
class ChildComponent extends Component {
    comProp;
}
