import { Component, ClassBinding, TemplateSlot, SlotPosition, CompiledTemplateResult, TemplateMaker, HTMLMaker } from '@pucelle/lupos.js';
import { trackGet, trackSet } from "@pucelle/lupos";
const $html_0 = /*#__PURE__*/ new HTMLMaker("<div></div>");
/*
<root>
    <ChildComponent :class=${'className'} .prop=${this.prop} />
</root>
*/ const $template_0 = /*#__PURE__*/ new TemplateMaker(function () {
    let $latest_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $com_0 = new ChildComponent($node_0);
    let $binding_0 = new ClassBinding($node_0);
    $binding_0.updateString('className');
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $com_0.prop = $values[0];
                $latest_0 = $values[0];
                trackSet($com_0, "prop");
            }
        },
        parts: [
            [$com_0, 1]
        ]
    };
});
const $html_1 = /*#__PURE__*/ new HTMLMaker("<div>Rest Content</div>");
/*
<root>
    <ChildComponent>Rest Content</ChildComponent>
</root>
*/ const $template_1 = /*#__PURE__*/ new TemplateMaker(function () {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node_0.firstChild;
    let $com_0 = new ChildComponent($node_0);
    $com_0.$applyRestSlotRangeNodes($node_1);
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        parts: [
            [$com_0, 1]
        ]
    };
});
const $html_2 = /*#__PURE__*/ new HTMLMaker("<div><!---->Rest Content</div>");
/*
<root>
    <ChildComponent>
        Rest Content
    </ChildComponent>
</root>
*/ const $template_2 = /*#__PURE__*/ new TemplateMaker(function ($context) {
    let $node = $html_2.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node_0.firstChild;
    let $node_2 = $node_0.lastChild;
    let $com_0 = new ChildComponent($node_0);
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_2), 0);
    $com_0.$applyRestSlotRangeNodes($node_1, $node_2);
    $slot_0.update(new CompiledTemplateResult($template_3, [], $context));
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        parts: [
            [$com_0, 1],
            [$slot_0, 0]
        ]
    };
});
/*
<root>
    <div />
</root>
*/ const $template_3 = /*#__PURE__*/ new TemplateMaker(function () {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
export class TestComponent extends Component {
    prop = 1;
    testComponent() {
        trackGet(this, "prop");
        return new CompiledTemplateResult($template_0, [
            this.prop
        ], this);
    }
    testRestSlotContent() {
        return new CompiledTemplateResult($template_1, [], this);
    }
    testRestSlotContentWithPrecedingTemplateSlot() {
        return new CompiledTemplateResult($template_2, [], this);
    }
}
class ChildComponent extends Component {
    prop;
}
