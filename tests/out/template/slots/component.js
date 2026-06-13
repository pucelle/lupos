import { Component, ClassBinding, TemplateSlot, SlotPosition, CompiledTemplateResult, TemplateMaker, HTMLMaker } from 'lupos.html';
import { trackGet, trackSet } from "lupos";
const $html_0 = /*#__PURE__*/ new HTMLMaker("<div com></div>");
/*
<root>
    <ChildComponent :class=${'className'} .prop=${this.prop} />
</root>
*/ const $template_0 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $latest_0;
    let $locator = $html_0.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $com_0 = new ChildComponent($node_0);
    let $binding_0 = new ClassBinding($node_0);
    $binding_0.updateString('className');
    return {
        el: $locator.el,
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
const $html_1 = /*#__PURE__*/ new HTMLMaker("<div com><!--ec0619-->Rest Content</div>");
/*
<root>
    <ChildComponent>
        Rest Content
    </ChildComponent>
</root>
*/ const $template_1 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_1.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.getMarker("ec0619");
    let $node_2 = $node_1.nextSibling;
    let $com_0 = new ChildComponent($node_0);
    $com_0.$setRestSlotRangeNodes($node_1, $node_2);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        parts: [
            [$com_0, 1]
        ]
    };
});
const $html_2 = /*#__PURE__*/ new HTMLMaker("<div com><!--483698--><!--89d63a-->Rest Content</div>");
/*
<root>
    <ChildComponent>
        ${html`<div />`}
        Rest Content
    </ChildComponent>
</root>
*/ const $template_2 = /*#__PURE__*/ new TemplateMaker(function ($context, $hydrates) {
    let $locator = $html_2.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.getMarker("483698");
    let $node_2 = $locator.getMarker("89d63a");
    let $node_3 = $node_2.nextSibling;
    let $com_0 = new ChildComponent($node_0);
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_2), 0, $locator.getNodes("89d63a"));
    $com_0.$setRestSlotRangeNodes($node_1, $node_3);
    $slot_0.update(new CompiledTemplateResult($template_3, [], $context));
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        parts: [
            [$com_0, 1],
            [$slot_0, 0]
        ]
    };
});
const $html_3 = /*#__PURE__*/ new HTMLMaker("<div></div>");
/*
<root>
    <div />
</root>
*/ const $template_3 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_3.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_4 = /*#__PURE__*/ new HTMLMaker("<slot com></slot>");
/*
<root>
    <ChildComponentWithTagName />
</root>
*/ const $template_4 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_4.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $com_0 = new ChildComponentWithTagName($node_0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        parts: [
            [$com_0, 1]
        ]
    };
});
const $html_5 = /*#__PURE__*/ new HTMLMaker("<pre com></pre>");
/*
<root>
    <ChildComponentWithTagName tagName="pre" />
</root>
*/ const $template_5 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_5.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $com_0 = new ChildComponentWithTagName($node_0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        parts: [
            [$com_0, 1]
        ]
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
    testTagNameDeclare() {
        return new CompiledTemplateResult($template_4, [], this);
    }
    testTagNameAttr() {
        return new CompiledTemplateResult($template_5, [], this);
    }
}
class ChildComponent extends Component {
    prop;
}
class ChildComponentWithTagName extends Component {
    prop;
}
