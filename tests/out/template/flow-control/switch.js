import { Component, TemplateSlot, SlotPosition, CompiledTemplateResult, TemplateMaker, HTMLMaker, SwitchBlock } from '@pucelle/lupos.js';
import { trackGet } from "@pucelle/lupos";
const $html_0 = /*#__PURE__*/ new HTMLMaker("<!----><!---->");
/*
<root>
    <lu:switch ${this.value} />
</root>
*/ const $template_0 = /*#__PURE__*/ new TemplateMaker(function () {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.lastChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1));
    let $block_0 = new SwitchBlock($slot_0);
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            $block_0.update($values[0]);
        },
        parts: [
            [$slot_0, 1]
        ]
    };
});
const $html_1 = /*#__PURE__*/ new HTMLMaker("Case Content 1");
/*
<root>Case Content 1</root>
*/ const $template_1 = /*#__PURE__*/ new TemplateMaker(function () {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_2 = /*#__PURE__*/ new HTMLMaker("Case Content 2");
/*
<root>Case Content 2</root>
*/ const $template_2 = /*#__PURE__*/ new TemplateMaker(function () {
    let $node = $html_2.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
/*
<root>
    <lu:switch ${this.value} />
</root>
*/ const $template_3 = /*#__PURE__*/ new TemplateMaker(function () {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.lastChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), 0);
    let $block_0 = new SwitchBlock($slot_0);
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            $block_0.update($values[0]);
        },
        parts: [
            [$slot_0, 1]
        ]
    };
});
/*
<root>Case Content 1</root>
*/ const $template_4 = /*#__PURE__*/ new TemplateMaker(function () {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
/*
<root>Case Content 2</root>
*/ const $template_5 = /*#__PURE__*/ new TemplateMaker(function () {
    let $node = $html_2.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_6 = /*#__PURE__*/ new HTMLMaker("Case Content 3");
/*
<root>Case Content 3</root>
*/ const $template_6 = /*#__PURE__*/ new TemplateMaker(function () {
    let $node = $html_6.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
export class TestSwitch extends Component {
    value = 1;
    testCaseOnly() {
        trackGet(this, "value");
        return new CompiledTemplateResult($template_0, [
            this.value === 1 ? new CompiledTemplateResult($template_1, [], this) : this.value === 2 ? new CompiledTemplateResult($template_2, [], this) : null
        ], this);
    }
    testCaseDefault() {
        trackGet(this, "value");
        return new CompiledTemplateResult($template_3, [
            this.value === 1 ? new CompiledTemplateResult($template_4, [], this) : this.value === 2 ? new CompiledTemplateResult($template_5, [], this) : new CompiledTemplateResult($template_6, [], this)
        ], this);
    }
}
