import { Component, CompiledTemplateResult, TemplateMaker, SlotPosition, HTMLMaker, ForBlock, TemplateSlot } from '@pucelle/lupos.js';
import { trackGet } from "@pucelle/ff";
const $html_0 = new HTMLMaker(" ");
/*
<root>${n + this.prop}</root>
*/ const $template_0 = new TemplateMaker(function () {
    let $latest_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
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
*/ const $template_1 = new TemplateMaker(function ($context) {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.lastChild;
    let $block_0 = new ForBlock($context.renderItem, new TemplateSlot(new SlotPosition(1, $node_1), $context, 1));
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update() {
            $block_0.update([1, 2, 3]);
        }
    };
});
/*
<root>${n + this.prop}</root>
*/ const $template_2 = new TemplateMaker(function () {
    let $latest_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $node_0.data = $latest_0 = $values[0];
            }
        }
    };
});
/*
<root>
    <lupos:for ${[1,2,3]} />
</root>
*/ const $template_3 = new TemplateMaker(function ($context) {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.lastChild;
    let $block_0 = new ForBlock((n) => new CompiledTemplateResult($template_2, [n + $context.prop]), new TemplateSlot(new SlotPosition(1, $node_1), $context, 1));
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update() {
            $block_0.update([1, 2, 3]);
        }
    };
});
/*
<root>${n + prop}</root>
*/ const $template_4 = new TemplateMaker(function () {
    let $latest_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $node_0.data = $latest_0 = $values[0];
            }
        }
    };
});
/*
<root>
    <lupos:for ${[1,2,3]} />
</root>
*/ const $template_5 = new TemplateMaker(function ($context, $latestValues) {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.lastChild;
    let $block_0 = new ForBlock((n) => new CompiledTemplateResult($template_4, [n + $latestValues[0]]), new TemplateSlot(new SlotPosition(1, $node_1), $context, 1));
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            $latestValues = $values;
            $block_0.update([1, 2, 3]);
        }
    };
});
class TestFor extends Component {
    prop = 1;
    renderItem(n) {
        trackGet(this, "prop");
        return new CompiledTemplateResult($template_0, [n + this.prop]);
    }
    testForMapFn() {
        return new CompiledTemplateResult($template_1, []);
    }
    testForLocalMapFn() {
        return new CompiledTemplateResult($template_3, []);
    }
    testForLocalVariableTransferring() {
        let prop = this.prop;
        trackGet(this, "prop");
        return new CompiledTemplateResult($template_5, [prop]);
    }
}
