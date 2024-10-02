import { Component, CompiledTemplateResult, TemplateMaker, SlotPosition, AwaitBlock, TemplateSlot, HTMLMaker } from '@pucelle/lupos.js';
import { trackGet } from "@pucelle/ff";
const $html_0 = new HTMLMaker("<!----><!---->");
/*
<root>
    <lu:await ${this.promise} />
</root>
*/ const $template_0 = new TemplateMaker(function ($context) {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.lastChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), $context);
    let $block_0 = new AwaitBlock([$template_1, $template_2, null], $slot_0);
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            $block_0.update($values[0], $values);
        },
        parts: [[$slot_0, 0]]
    };
});
const $html_1 = new HTMLMaker("Pending Content");
/*
<root>Pending Content</root>
*/ const $template_1 = new TemplateMaker(function () {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_2 = new HTMLMaker("Then Content");
/*
<root>Then Content</root>
*/ const $template_2 = new TemplateMaker(function () {
    let $node = $html_2.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
/*
<root>
    <lu:await ${this.promise} />
</root>
*/ const $template_3 = new TemplateMaker(function ($context) {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.lastChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), $context);
    let $block_0 = new AwaitBlock([$template_4, null, $template_5], $slot_0);
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            $block_0.update($values[0], $values);
        },
        parts: [[$slot_0, 0]]
    };
});
/*
<root>Pending Content</root>
*/ const $template_4 = new TemplateMaker(function () {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_5 = new HTMLMaker("Catch Content");
/*
<root>Catch Content</root>
*/ const $template_5 = new TemplateMaker(function () {
    let $node = $html_5.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
/*
<root>
    <lu:await ${this.promise} />
</root>
*/ const $template_6 = new TemplateMaker(function ($context) {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.lastChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), $context);
    let $block_0 = new AwaitBlock([$template_7, $template_8, $template_9], $slot_0);
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            $block_0.update($values[0], $values);
        },
        parts: [[$slot_0, 0]]
    };
});
/*
<root>Pending Content</root>
*/ const $template_7 = new TemplateMaker(function () {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
/*
<root>Then Content</root>
*/ const $template_8 = new TemplateMaker(function () {
    let $node = $html_2.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
/*
<root>Catch Content</root>
*/ const $template_9 = new TemplateMaker(function () {
    let $node = $html_5.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
class TestAwait extends Component {
    promise = Promise.resolve();
    testAwaitThen() {
        trackGet(this, "promise");
        return new CompiledTemplateResult($template_0, [this.promise]);
    }
    testAwaitCatch() {
        trackGet(this, "promise");
        return new CompiledTemplateResult($template_3, [this.promise]);
    }
    testAwaitThenCatch() {
        trackGet(this, "promise");
        return new CompiledTemplateResult($template_6, [this.promise]);
    }
}
