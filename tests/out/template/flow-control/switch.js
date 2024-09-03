import { Component, html, CompiledTemplateResult, TemplateMaker, SlotPosition, SwitchBlock, TemplateSlot, HTMLMaker } from '@pucelle/lupos.js';
import { trackGet } from "@pucelle/ff";
const $html_0 = new HTMLMaker("<!----><!---->");
/*
<root>
    <lupos:switch ${this.value} />
</root>
*/ const $template_0 = new TemplateMaker($context => {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.lastChild;
    $block_0 = new SwitchBlock(function ($values) {
        switch ($values[0]) {
            case 1: return 0;
            case 2: return 1;
            default: return -1;
        }
    }, [$template_1, $template_2], new TemplateSlot(new SlotPosition(2, $node_1), $context));
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        update($values) {
            $block_0.update($values);
        }
    };
});
const $html_1 = new HTMLMaker("Case Content 1");
/*
<root></root>
*/ const $template_1 = new TemplateMaker($context => {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0)
    };
});
const $html_2 = new HTMLMaker("Case Content 2");
/*
<root></root>
*/ const $template_2 = new TemplateMaker($context => {
    let $node = $html_2.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0)
    };
});
/*
<root>
    <lupos:switch ${this.value} />
</root>
*/ const $template_3 = new TemplateMaker($context => {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.lastChild;
    $block_0 = new SwitchBlock(function ($values) {
        switch ($values[0]) {
            case 1: return 0;
            case 2: return 1;
            default: return 2;
        }
    }, [$template_4, $template_5, $template_6], new TemplateSlot(new SlotPosition(2, $node_1), $context));
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        update($values) {
            $block_0.update($values);
        }
    };
});
/*
<root></root>
*/ const $template_4 = new TemplateMaker($context => {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0)
    };
});
/*
<root></root>
*/ const $template_5 = new TemplateMaker($context => {
    let $node = $html_2.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0)
    };
});
const $html_3 = new HTMLMaker("Case Content 3");
/*
<root></root>
*/ const $template_6 = new TemplateMaker($context => {
    let $node = $html_3.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0)
    };
});
class TestSwitch extends Component {
    value = 1;
    testCaseOnly() {
        trackGet(this, "value");
        return new CompiledTemplateResult($template_0, [this.value]);
    }
    testCaseDefault() {
        trackGet(this, "value");
        return new CompiledTemplateResult($template_3, [this.value]);
    }
}
