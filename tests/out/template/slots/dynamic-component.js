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
    let $node_1 = $node.content.childNodes[1];
    let $node_2 = $node.content.lastChild;
    let $block_0 = new DynamicComponentBlock(function (com) {
        $com_0 = com;
    }, $node_1, new TemplateSlot(new SlotPosition(1, $node_2), $context));
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
    let $node_1 = $node.content.childNodes[1];
    let $node_3 = $node_1.firstChild;
    let $node_2 = $node.content.lastChild;
    let $block_0 = new DynamicComponentBlock(function (com) {
        $com_0 = com;
    }, $node_1, new TemplateSlot(new SlotPosition(1, $node_2), $context), new SlotRange($node_3, $node_3));
    $block_0.update(ChildComponent);
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        parts: () => [$com_0]
    };
});
const $html_2 = new HTMLMaker("<!----><div><div></div></div><!---->");
/*
<root>
    <${ChildComponent} :class=$LUPOS_SLOT_INDEX_1$>
        <div :class=${'className'} />
    </>
</root>
*/ const $template_2 = new TemplateMaker(function ($context) {
    let $binding_0, $com_0;
    let $node = $html_2.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.childNodes[1];
    let $node_3 = $node_1.firstChild;
    let $node_2 = $node.content.lastChild;
    let $block_0 = new DynamicComponentBlock(function (com) {
        $node_1 = com.el;
        $com_0 = com;
        $binding_0 = new ClassBinding($node_1);
        $binding_0.updateString('className');
    }, $node_1, new TemplateSlot(new SlotPosition(1, $node_2), $context), new SlotRange($node_3, $node_3));
    let $binding_1 = new ClassBinding($node_3);
    $block_0.update(ChildComponent);
    $binding_1.updateString('className');
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
*/ const $template_3 = new TemplateMaker(function ($context) {
    let $binding_0, $com_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.childNodes[1];
    let $node_2 = $node.content.lastChild;
    let $block_0 = new DynamicComponentBlock(function (com) {
        $node_1 = com.el;
        $com_0 = com;
        $binding_0 = new ClassBinding($node_1);
        $binding_0.updateString('className');
    }, $node_1, new TemplateSlot(new SlotPosition(1, $node_2), $context));
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
*/ const $template_4 = new TemplateMaker(function ($context) {
    let $latest_0, $com_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.childNodes[1];
    let $node_2 = $node.content.lastChild;
    let $block_0 = new DynamicComponentBlock(function (com) {
        $node_1 = com.el;
        $com_0 = com;
    }, $node_1, new TemplateSlot(new SlotPosition(1, $node_2), $context));
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
    testChildContentReference() {
        return new CompiledTemplateResult($template_2, []);
    }
    testStaticBinding() {
        return new CompiledTemplateResult($template_3, []);
    }
    testDynamicProp() {
        trackGet(this, "prop");
        return new CompiledTemplateResult($template_4, [this.prop]);
    }
}
class ChildComponent extends Component {
    prop;
}
