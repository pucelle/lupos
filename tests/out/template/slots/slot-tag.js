import { Component, CompiledTemplateResult, TemplateMaker, SlotPosition, TemplateSlot, HTMLMaker } from '@pucelle/lupos.js';
const $html_0 = new HTMLMaker("<div><slot name=\"slotName\"></slot></div>");
/*
<root>
    <div>
        <slot name="slotName" />
    </div>
</root>
*/ const $template_0 = new TemplateMaker(function ($context) {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node_0.firstChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(0, $node_1), $context, 3);
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
*/ const $template_1 = new TemplateMaker(function ($context) {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node_0.firstChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(0, $node_1), $context);
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
const $html_2 = new HTMLMaker("Content");
/*
<root>Content</root>
*/ const $template_2 = new TemplateMaker(function () {
    let $node = $html_2.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_3 = new HTMLMaker("<div><slot></slot></div>");
/*
<root>
    <div>
        <slot />
    </div>
</root>
*/ const $template_3 = new TemplateMaker(function ($context) {
    let $node = $html_3.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node_0.firstChild;
    $node_1.append(...$context.__getRestSlotNodes());
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
export class TestComponent extends Component {
    prop = 1;
    testNamedSlot() {
        return new CompiledTemplateResult($template_0, [
            this.__getSlotElement("slotName")
        ]);
    }
    testNamedSlotWithContent() {
        return new CompiledTemplateResult($template_1, [
            this.__getSlotElement("slotName") ?? new CompiledTemplateResult($template_2, [])
        ]);
    }
    testRestSlot() {
        return new CompiledTemplateResult($template_3, []);
    }
}
