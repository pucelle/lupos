import { Component, html, ClassBinding, RenderResult, TemplateMaker, SlotPosition, TemplateSlot, HTMLMaker, CompiledTemplateResult, SlotRange } from '@pucelle/lupos.js';
import { trackGet } from "@pucelle/ff";
const $html_0 = new HTMLMaker("<div><slot name=\"slotName\"></slot></div>");
const $template_0 = new TemplateMaker($context => {
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
const $html_1 = new HTMLMaker("<div><slot name=\"slotName\"></slot></div>");
const $template_1 = new TemplateMaker($context => {
    let $node = $html_1.make();
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
const $html_2 = new HTMLMaker("Content");
const $template_2 = new TemplateMaker($context => {
    let $node = $html_2.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0)
    };
});
const $html_3 = new HTMLMaker("<div><slot></slot></div>");
const $template_3 = new TemplateMaker($context => {
    let $node = $html_3.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node_0.firstChild;
    $node_1.append(...$context.__getRestSlotNodes());
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        parts: [$slot_0]
    };
});
const $html_4 = new HTMLMaker("<div></div>");
const $template_4 = new TemplateMaker($context => {
    let $latest_0;
    let $node = $html_4.make();
    let $node_0 = $node.content.firstChild;
    let $com_0 = new ChildComponent($node_0);
    let $binding_0 = new ClassBinding($node_0);
    $binding_0.updateString('className');
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $node_0.prop = $latest_0 = $values[0];
            }
        },
        parts: [$com_0, $binding_0]
    };
});
const $html_5 = new HTMLMaker("<div>Rest Content</div>");
const $template_5 = new TemplateMaker($context => {
    let $node = $html_5.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node_0.firstChild;
    let $com_0 = new ChildComponent($node_0);
    $com_0.__applyRestSlotRange(new SlotRange($node_1, $node_1));
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        parts: [$com_0]
    };
});
const $html_6 = new HTMLMaker("<div> </div>");
const $template_6 = new TemplateMaker($context => {
    let $latest_0;
    let $node = $html_6.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node_0.firstChild;
    let $com_0 = new ChildComponent($node_0);
    $com_0.__applyRestSlotRange(new SlotRange($node_1, $node_1));
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        update($values) {
            if ($latest_0 !== "" + $values[0] + "Rest Content") {
                $node_1.data = $latest_0 = "" + $values[0] + "Rest Content";
            }
        },
        parts: [$com_0]
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
    testComponent() {
        trackGet(this, "prop");
        return new CompiledTemplateResult($template_4, [this.prop]);
    }
    testRestSlotContent() {
        return new CompiledTemplateResult($template_5, []);
    }
    testRestSlotContentWithPrecedingSlot() {
        trackGet(this, "prop");
        return new CompiledTemplateResult($template_6, [this.prop]);
    }
}
class ChildComponent extends Component {
    prop;
}
