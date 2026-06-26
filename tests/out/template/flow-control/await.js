import { Component, TemplateSlot, SlotPosition, CompiledTemplateResult, TemplateMaker, AwaitBlock, HTMLMaker } from 'lupos.html';
import { trackGet } from "lupos";
const $html_0 = /*#__PURE__*/ new HTMLMaker("<!----><!--843fe97c-->");
/*
<root>
    <lu:await ${this.promise} />
</root>
*/ const $template_0 = /*#__PURE__*/ new TemplateMaker(function ($context, $hydrates) {
    let $locator = $html_0.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.getMarker("843fe97c");
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), null, $locator.getNodes("843fe97c"));
    let $block_0 = new AwaitBlock($template_1, $slot_0, $context);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        update($values) {
            $block_0.update($values[0], $values);
        },
        parts: [
            [$slot_0, 1]
        ]
    };
});
const $html_1 = /*#__PURE__*/ new HTMLMaker("Pending Content");
/*
<root>Pending Content</root>
*/ const $template_1 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_1.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_2 = /*#__PURE__*/ new HTMLMaker("<!----><!--c3c11796-->");
/*
<root>
    <lu:await ${this.promise} />
</root>
*/ const $template_2 = /*#__PURE__*/ new TemplateMaker(function ($context, $hydrates) {
    let $locator = $html_2.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.getMarker("c3c11796");
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), null, $locator.getNodes("c3c11796"));
    let $block_0 = new AwaitBlock($template_3, $slot_0, $context);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        update($values) {
            $block_0.update($values[0], $values);
        },
        parts: [
            [$slot_0, 1]
        ]
    };
});
/*
<root>Pending Content</root>
*/ const $template_3 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_1.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_4 = /*#__PURE__*/ new HTMLMaker("<!----><!--ed876a83-->");
/*
<root>
    <lu:await ${this.promise} />
</root>
*/ const $template_4 = /*#__PURE__*/ new TemplateMaker(function ($context, $hydrates) {
    let $locator = $html_4.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.getMarker("ed876a83");
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), null, $locator.getNodes("ed876a83"));
    let $block_0 = new AwaitBlock($template_5, $slot_0, $context);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        update($values) {
            $block_0.update($values[0], $values);
        },
        parts: [
            [$slot_0, 1]
        ]
    };
});
/*
<root>Pending Content</root>
*/ const $template_5 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_1.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
export class TestAwait extends Component {
    promise = Promise.resolve(null);
    testAwaitThen() {
        trackGet(this, "promise");
        return new CompiledTemplateResult($template_0, [
            this.promise
        ], this);
    }
    testAwaitCatch() {
        trackGet(this, "promise");
        return new CompiledTemplateResult($template_2, [
            this.promise
        ], this);
    }
    testAwaitThenCatch() {
        trackGet(this, "promise");
        return new CompiledTemplateResult($template_4, [
            this.promise
        ], this);
    }
}
