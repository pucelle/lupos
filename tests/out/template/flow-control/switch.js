import { Component, TemplateSlot, SlotPosition, CompiledTemplateResult, TemplateMaker, HTMLMaker, CacheableSwitchBlock } from 'lupos.html';
import { trackGet } from "lupos";
const $html_0 = /*#__PURE__*/ new HTMLMaker("<!----><!--b9615f98-->");
/*
<root>
    <lu:switch ${this.value} />
</root>
*/ const $template_0 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_0.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.getMarker("b9615f98");
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), null, $locator.getNodes("b9615f98"));
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        update($values) {
            $slot_0.update($values[0]);
        },
        parts: [
            [$slot_0, 1]
        ]
    };
});
const $html_1 = /*#__PURE__*/ new HTMLMaker("Case Content 1");
/*
<root>Case Content 1</root>
*/ const $template_1 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_1.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_2 = /*#__PURE__*/ new HTMLMaker("Case Content 2");
/*
<root>Case Content 2</root>
*/ const $template_2 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_2.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_3 = /*#__PURE__*/ new HTMLMaker("<!----><!--e707ad08-->");
/*
<root>
    <lu:switch ${this.value} />
</root>
*/ const $template_3 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_3.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.getMarker("e707ad08");
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), 0, $locator.getNodes("e707ad08"));
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        update($values) {
            $slot_0.update($values[0]);
        },
        parts: [
            [$slot_0, 1]
        ]
    };
});
/*
<root>Case Content 1</root>
*/ const $template_4 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_1.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
/*
<root>Case Content 2</root>
*/ const $template_5 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_2.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_6 = /*#__PURE__*/ new HTMLMaker("Case Content 3");
/*
<root>Case Content 3</root>
*/ const $template_6 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_6.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_7 = /*#__PURE__*/ new HTMLMaker("<!----><!--8dae8909-->");
/*
<root>
    <lu:switch ${this.value} cache />
</root>
*/ const $template_7 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_7.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.getMarker("8dae8909");
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), 0, $locator.getNodes("8dae8909"));
    let $block_0 = new CacheableSwitchBlock($slot_0);
    return {
        el: $locator.el,
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
*/ const $template_8 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_1.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_9 = /*#__PURE__*/ new HTMLMaker("Default Content");
/*
<root>Default Content</root>
*/ const $template_9 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_9.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
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
    /** Keep a previously rendered case when switching branches. */
    testCacheableCase() {
        trackGet(this, "value");
        return new CompiledTemplateResult($template_7, [
            this.value === 1 ? new CompiledTemplateResult($template_8, [], this) : new CompiledTemplateResult($template_9, [], this)
        ], this);
    }
}
