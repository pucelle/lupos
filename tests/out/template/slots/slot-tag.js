import { Component, html, ClassBinding, CompiledTemplateResult, TemplateMaker, SlotPosition, TemplateSlot, HTMLMaker } from '@pucelle/lupos.js';
const $html_0 = new HTMLMaker("<div><slot name=\"slotName\"></slot></div>");
/*
<root>
    <div>
        <slot name="slotName" />
    </div>
</root>
*/ const $template_0 = new TemplateMaker($context => {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node_0.firstChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), $context, 3);
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        update($values) {
            $slot_0.update($context.__getSlotElement("name"));
        },
        parts: [$slot_0]
    };
});
/*
<root>
    <div>
        <slot name="slotName" />
    </div>
</root>
*/ const $template_1 = new TemplateMaker($context => {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node_0.firstChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), $context);
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        update($values) {
            $slot_0.update($context.__getSlotElement("name") ?? new CompiledTemplateResult($template_2, $values));
        },
        parts: [$slot_0]
    };
});
const $html_1 = new HTMLMaker("Content");
/*
<root></root>
*/ const $template_2 = new TemplateMaker($context => {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0)
    };
});
const $html_2 = new HTMLMaker("<div><slot></slot></div>");
/*
<root>
    <div>
        <slot />
    </div>
</root>
*/ const $template_3 = new TemplateMaker($context => {
    let $node = $html_2.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node_0.firstChild;
    $node_1.append(...$context.__getRestSlotNodes());
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        parts: [$slot_0]
    };
});
class TestComponent extends Component {
    prop = 1;
    testNamedSlot() {
        return new CompiledTemplateResult($template_0, []);
    }
    testNamedSlotWithContent() {
        return new CompiledTemplateResult($template_1, []);
    }
    testRestSlot() {
        return new CompiledTemplateResult($template_3, []);
    }
}
