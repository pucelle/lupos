import { Component, html, ClassBinding, TemplateMaker, SlotPosition, DynamicComponentBlock, TemplateSlot, HTMLMaker, SlotRange } from '@pucelle/lupos.js';
import { trackGet } from "@pucelle/ff";
const $html_0 = new HTMLMaker("<!----><div></div><!---->");
const $template_0 = new TemplateMaker($context => {
    let $com_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.lastChild;
    let $block_0 = new DynamicComponentBlock(function (com) {
        $com_0 = com;
    }, new TemplateSlot(new SlotPosition(2, $node_1), $context));
    $block_0.update(ChildComponent);
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        parts: () => [$com_0]
    };
});
const $html_1 = new HTMLMaker("<!----><div>Content</div><!---->");
const $template_1 = new TemplateMaker($context => {
    let $com_0;
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    let $node_2 = $node.content.childNodes[1].firstChild;
    let $node_1 = $node.content.lastChild;
    let $block_0 = new DynamicComponentBlock(function (com) {
        $com_0 = com;
    }, new TemplateSlot(new SlotPosition(2, $node_1), $context), new SlotRange($node_2, $node_2));
    $block_0.update(ChildComponent);
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        parts: () => [$com_0]
    };
});
const $template_2 = new TemplateMaker($context => {
    let $binding_0, $com_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $node_1;
    let $node_2 = $node.content.lastChild;
    let $block_0 = new DynamicComponentBlock(function (com) {
        $node_1 = com.el;
        $com_0 = com;
        $binding_0 = new ClassBinding($node_1);
        $binding_0.updateString('className');
    }, new TemplateSlot(new SlotPosition(2, $node_2), $context));
    $block_0.update(ChildComponent);
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        parts: () => [$com_0]
    };
});
const $template_3 = new TemplateMaker($context => {
    let $latest_0, $com_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $node_1;
    let $node_2 = $node.content.lastChild;
    let $block_0 = new DynamicComponentBlock(function (com) {
        $node_1 = com.el;
        $com_0 = com;
    }, new TemplateSlot(new SlotPosition(2, $node_2), $context));
    $block_0.update(ChildComponent);
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $node_1.prop = $latest_0 = $values[0];
            }
        },
        parts: () => [$com_0]
    };
});
class TestDynamicComponent extends Component {
    prop = 1;
    testNormal() {
        return new CompiledTemplateResult($template_0, []);
    }
    testChildContent() {
        return new CompiledTemplateResult($template_1, []);
    }
    testStaticBinding() {
        return new CompiledTemplateResult($template_2, []);
    }
    testDynamicProp() {
        trackGet(this, "prop");
        return new CompiledTemplateResult($template_3, [this.prop]);
    }
}
class ChildComponent extends Component {
    prop;
}
