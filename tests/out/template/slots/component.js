import { Component, html, ClassBinding, CompiledTemplateResult, TemplateMaker, SlotPosition, HTMLMaker, SlotRange } from '@pucelle/lupos.js';
import { trackGet } from "@pucelle/ff";
const $html_0 = new HTMLMaker("<div></div>");
/*
<root>
    <ChildComponent :class=${'className'} .prop=$LUPOS_SLOT_INDEX_1$ />
</root>
*/ const $template_0 = new TemplateMaker($context => {
    let $latest_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $com_0 = new ChildComponent({}, $node_0);
    let $binding_0 = new ClassBinding($node_0);
    $binding_0.updateString('className');
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $com_0.prop = $latest_0 = $values[0];
            }
        },
        parts: [$com_0]
    };
});
const $html_1 = new HTMLMaker("<div>Rest Content</div>");
/*
<root>
    <ChildComponent>Rest Content</ChildComponent>
</root>
*/ const $template_1 = new TemplateMaker($context => {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node_0.firstChild;
    let $com_0 = new ChildComponent({}, $node_0);
    $com_0.__applyRestSlotRange(new SlotRange($node_1, $node_1));
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        parts: [$com_0]
    };
});
const $html_2 = new HTMLMaker("<div> </div>");
/*
<root>
    <ChildComponent>${this.prop}Rest Content</ChildComponent>
</root>
*/ const $template_2 = new TemplateMaker($context => {
    let $latest_0;
    let $node = $html_2.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node_0.firstChild;
    let $com_0 = new ChildComponent({}, $node_0);
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
    testComponent() {
        trackGet(this, "prop");
        return new CompiledTemplateResult($template_0, [this.prop]);
    }
    testRestSlotContent() {
        return new CompiledTemplateResult($template_1, []);
    }
    testRestSlotContentWithPrecedingTemplateSlot() {
        trackGet(this, "prop");
        return new CompiledTemplateResult($template_2, [this.prop]);
    }
}
class ChildComponent extends Component {
    prop;
}
