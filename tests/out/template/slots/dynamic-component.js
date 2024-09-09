import { Component, html, CompiledTemplateResult, TemplateMaker, SlotPosition, DynamicComponentBlock, TemplateSlot, HTMLMaker, SlotRange, ClassBinding } from '@pucelle/lupos.js';
import { trackGet } from "@pucelle/ff";
const $html_0 = new HTMLMaker("<!----><div></div><!---->");
/*
<root>
    <${ChildComponent} />
</root>
*/ const $template_0 = new TemplateMaker(function ($context) {
    let $com_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.lastChild;
    let $block_0 = new DynamicComponentBlock(function (com) {
        $com_0 = com;
    }, new TemplateSlot(new SlotPosition(1, $node_1), $context));
    $block_0.update(ChildComponent);
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        parts: () => [$com_0]
    };
});
const $html_1 = new HTMLMaker("<!----><div>Content</div><!---->");
/*
<root>
    <${ChildComponent}>Content</>
</root>
*/ const $template_1 = new TemplateMaker(function ($context) {
    let $com_0;
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    let $node_2 = $node.content.childNodes[1].firstChild;
    let $node_1 = $node.content.lastChild;
    let $block_0 = new DynamicComponentBlock(function (com) {
        $com_0 = com;
    }, new TemplateSlot(new SlotPosition(1, $node_1), $context), new SlotRange($node_2, $node_2));
    $block_0.update(ChildComponent);
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        parts: () => [$com_0]
    };
});
/*
<root>
    <${ChildComponent} :class=$LUPOS_SLOT_INDEX_1$ />
</root>
*/ const $template_2 = new TemplateMaker(function ($context) {
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
    }, new TemplateSlot(new SlotPosition(1, $node_2), $context));
    $block_0.update(ChildComponent);
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        parts: () => [$com_0]
    };
});
/*
<root>
    <${ChildComponent} .prop=$LUPOS_SLOT_INDEX_1$ />
</root>
*/ const $template_3 = new TemplateMaker(function ($context) {
    let $latest_0, $com_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $node_1;
    let $node_2 = $node.content.lastChild;
    let $block_0 = new DynamicComponentBlock(function (com) {
        $node_1 = com.el;
        $com_0 = com;
    }, new TemplateSlot(new SlotPosition(1, $node_2), $context));
    $block_0.update(ChildComponent);
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
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
