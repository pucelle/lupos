import { Component, TemplateSlot, SlotPosition, CompiledTemplateResult, TemplateMaker, AwaitBlock, HTMLMaker } from 'lupos.html';
import { trackGet } from "lupos";
const $html_0 = /*#__PURE__*/ new HTMLMaker("<!----><!--843fe9-->");
/*
<root>
    <lu:await ${this.promise} />
</root>
*/ const $template_0 = /*#__PURE__*/ new TemplateMaker(function ($context, $hydrates) {
    let $locator = $html_0.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.getMarker("843fe9");
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), null, $locator.getNodes("843fe9"));
    let $block_0 = new AwaitBlock([$template_1, $template_2, null], $slot_0, $context);
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
const $html_2 = /*#__PURE__*/ new HTMLMaker("Then Content");
/*
<root>Then Content</root>
*/ const $template_2 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_2.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_3 = /*#__PURE__*/ new HTMLMaker("<!----><!--ed876a-->");
/*
<root>
    <lu:await ${this.promise} />
</root>
*/ const $template_3 = /*#__PURE__*/ new TemplateMaker(function ($context, $hydrates) {
    let $locator = $html_3.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.getMarker("ed876a");
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), null, $locator.getNodes("ed876a"));
    let $block_0 = new AwaitBlock([$template_4, null, $template_5], $slot_0, $context);
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
*/ const $template_4 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_1.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_5 = /*#__PURE__*/ new HTMLMaker("Catch Content");
/*
<root>Catch Content</root>
*/ const $template_5 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_5.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_6 = /*#__PURE__*/ new HTMLMaker("<!----><!--7e052f-->");
/*
<root>
    <lu:await ${this.promise} />
</root>
*/ const $template_6 = /*#__PURE__*/ new TemplateMaker(function ($context, $hydrates) {
    let $locator = $html_6.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.getMarker("7e052f");
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), null, $locator.getNodes("7e052f"));
    let $block_0 = new AwaitBlock([$template_7, $template_8, $template_9], $slot_0, $context);
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
*/ const $template_7 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_1.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
/*
<root>Then Content</root>
*/ const $template_8 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_2.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
/*
<root>Catch Content</root>
*/ const $template_9 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_5.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
export class TestAwait extends Component {
    promise = Promise.resolve();
    testAwaitThen() {
        trackGet(this, "promise");
        return new CompiledTemplateResult($template_0, [
            this.promise
        ], this);
    }
    testAwaitCatch() {
        trackGet(this, "promise");
        return new CompiledTemplateResult($template_3, [
            this.promise
        ], this);
    }
    testAwaitThenCatch() {
        trackGet(this, "promise");
        return new CompiledTemplateResult($template_6, [
            this.promise
        ], this);
    }
}
