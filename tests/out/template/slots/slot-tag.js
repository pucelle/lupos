import { Component, SlotBinding, CompiledTemplateResult, TemplateMaker, SlotPosition, TemplateSlot, HTMLMaker } from '@pucelle/lupos.js';
const $html_0 = /*#__PURE__*/ new HTMLMaker("<div><slot name=\"slotName\"></slot></div>");
/*
<root>
    <div>
        <slot name="slotName" />
    </div>
</root>
*/ const $template_0 = /*#__PURE__*/ new TemplateMaker(function () {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node_0.firstChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(0, $node_1), 3);
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            $slot_0.update($values[0]);
        },
        parts: [
            [$slot_0, 0]
        ]
    };
});
/*
<root>
    <div>
        <slot name="slotName" />
    </div>
</root>
*/ const $template_1 = /*#__PURE__*/ new TemplateMaker(function () {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node_0.firstChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(0, $node_1));
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            $slot_0.update($values[0]);
        },
        parts: [
            [$slot_0, 0]
        ]
    };
});
const $html_2 = /*#__PURE__*/ new HTMLMaker("Content");
/*
<root>Content</root>
*/ const $template_2 = /*#__PURE__*/ new TemplateMaker(function () {
    let $node = $html_2.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_3 = /*#__PURE__*/ new HTMLMaker("<div><!----><div>Content</div></div>");
/*
<root>
    <ChildCom>
        <div :slot="slotName">Content</div>
    </ChildCom>
</root>
*/ const $template_3 = /*#__PURE__*/ new TemplateMaker(function () {
    let $node = $html_3.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node_0.firstChild;
    let $node_2 = $node_0.lastChild;
    let $com_0 = new ChildCom($node_0);
    let $binding_0 = new SlotBinding($node_2);
    $com_0.$applyRestSlotRangeNodes($node_1);
    $binding_0.update("slotName");
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        parts: [
            [$com_0, 1],
            [$binding_0, 0]
        ]
    };
});
const $html_4 = /*#__PURE__*/ new HTMLMaker("<div><slot></slot></div>");
/*
<root>
    <div>
        <slot />
    </div>
</root>
*/ const $template_4 = /*#__PURE__*/ new TemplateMaker(function ($context) {
    let $node = $html_4.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node_0.firstChild;
    $node_1.append(...$context.$getRestSlotNodes());
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
export class TestComponent extends Component {
    prop = 1;
    testNamedSlot() {
        return new CompiledTemplateResult($template_0, [
            this.$getSlotElement("slotName")
        ], this);
    }
    testNamedSlotWithContent() {
        return new CompiledTemplateResult($template_1, [
            this.$getSlotElement("slotName") ?? new CompiledTemplateResult($template_2, [], this)
        ], this);
    }
    testNamedSlotContentAsRestSlotContent() {
        return new CompiledTemplateResult($template_3, [], this);
    }
    testRestSlot() {
        return new CompiledTemplateResult($template_4, [], this);
    }
}
class ChildCom extends Component {
}
