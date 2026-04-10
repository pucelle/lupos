import { Component, TemplateSlot, SlotPosition, CompiledTemplateResult, TemplateMaker, HTMLMaker, IfBlock } from 'lupos.html';
import { trackGet } from "lupos";
const $html_0 = /*#__PURE__*/ new HTMLMaker("<div><!--0b3868--></div>");
/*
<root>
    <div>
        ${html`<div></div>`}
    </div>
</root>
*/ const $template_0 = /*#__PURE__*/ new TemplateMaker(function ($context, $hydrates) {
    let $locator = $html_0.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.getMarker("0b3868");
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), 0, $locator.getNodes("0b3868"));
    $slot_0.update(new CompiledTemplateResult($template_1, [], $context));
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        parts: [
            [$slot_0, 0]
        ]
    };
});
const $html_1 = /*#__PURE__*/ new HTMLMaker("<div></div>");
/*
<root>
    <div />
</root>
*/ const $template_1 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_1.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_2 = /*#__PURE__*/ new HTMLMaker("<div><!--36766e--></div>");
/*
<root>
    <div>
        ${[html`<div></div>`]}
    </div>
</root>
*/ const $template_2 = /*#__PURE__*/ new TemplateMaker(function ($context, $hydrates) {
    let $locator = $html_2.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.getMarker("36766e");
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), 1, $locator.getNodes("36766e"));
    $slot_0.update([new CompiledTemplateResult($template_3, [], $context)]);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        parts: [
            [$slot_0, 0]
        ]
    };
});
/*
<root>
    <div />
</root>
*/ const $template_3 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_1.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_4 = /*#__PURE__*/ new HTMLMaker("<div><!--484aad--></div>");
/*
<root>
    <div>
        ${this.booleanProp ? '1' : html`<div></div>`}
    </div>
</root>
*/ const $template_4 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $latest_0;
    let $locator = $html_4.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.getMarker("484aad");
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), null, $locator.getNodes("484aad"));
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $slot_0.update($values[0]);
                $latest_0 = $values[0];
            }
        },
        parts: [
            [$slot_0, 0]
        ]
    };
});
/*
<root>
    <div />
</root>
*/ const $template_5 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_1.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_6 = /*#__PURE__*/ new HTMLMaker("<div> <!--018800--> </div>");
/*
<root>
    <div>
        ${'1'}
        ${html`<div></div>`}
         ${'1'}
    </div>
</root>
*/ const $template_6 = /*#__PURE__*/ new TemplateMaker(function ($context, $hydrates) {
    let $locator = $html_6.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $node_0.firstChild;
    let $node_2 = $locator.getMarker("018800");
    let $node_3 = $node_2.nextSibling;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_2), 0, $locator.getNodes("018800"));
    $node_1.data = '1' + " ";
    $slot_0.update(new CompiledTemplateResult($template_7, [], $context));
    $node_3.data = " " + '1';
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        parts: [
            [$slot_0, 0]
        ]
    };
});
/*
<root>
    <div />
</root>
*/ const $template_7 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_1.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_8 = /*#__PURE__*/ new HTMLMaker("<div><!--d48322--><!--be246b--></div>");
/*
<root>
    <div>
        ${html`<div></div>`}
        ${html`<div></div>`}
    </div>
</root>
*/ const $template_8 = /*#__PURE__*/ new TemplateMaker(function ($context, $hydrates) {
    let $locator = $html_8.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.getMarker("d48322");
    let $node_2 = $locator.getMarker("be246b");
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), 0, $locator.getNodes("d48322"));
    let $slot_1 = new TemplateSlot(new SlotPosition(1, $node_2), 0, $locator.getNodes("be246b"));
    $slot_0.update(new CompiledTemplateResult($template_9, [], $context));
    $slot_1.update(new CompiledTemplateResult($template_10, [], $context));
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        parts: [
            [$slot_0, 0],
            [$slot_1, 0]
        ]
    };
});
/*
<root>
    <div />
</root>
*/ const $template_9 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_1.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
/*
<root>
    <div />
</root>
*/ const $template_10 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_1.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_11 = /*#__PURE__*/ new HTMLMaker("<!----><!--67028f--><!--99726d-->");
/*
<root>
    <template>
        <lu:if ${this.booleanProp} />
        ${html`<div></div>`}
    </template>
</root>
*/ const $template_11 = /*#__PURE__*/ new TemplateMaker(function ($context, $hydrates) {
    let $locator = $html_11.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.getMarker("67028f");
    let $node_2 = $locator.getMarker("99726d");
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), null, $locator.getNodes("67028f"));
    let $block_0 = new IfBlock($slot_0);
    let $slot_1 = new TemplateSlot(new SlotPosition(1, $node_2), 0, $locator.getNodes("99726d"));
    $slot_1.update(new CompiledTemplateResult($template_13, [], $context));
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        update($values) {
            $block_0.update($values[0]);
        },
        parts: [
            [$slot_0, 1],
            [$slot_1, 1]
        ]
    };
});
/*
<root>
    <div />
</root>
*/ const $template_12 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_1.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
/*
<root>
    <div />
</root>
*/ const $template_13 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_1.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
export class TestContent extends Component {
    booleanProp = true;
    testTemplateResultContent() {
        return new CompiledTemplateResult($template_0, [], this);
    }
    testTemplateResultListContent() {
        return new CompiledTemplateResult($template_2, [], this);
    }
    testMixedContent() {
        trackGet(this, "booleanProp");
        return new CompiledTemplateResult($template_4, [
            this.booleanProp ? '1' : new CompiledTemplateResult($template_5, [], this)
        ], this);
    }
    testMultipleContents() {
        return new CompiledTemplateResult($template_6, [], this);
    }
    testNeighborContents() {
        return new CompiledTemplateResult($template_8, [], this);
    }
    testNeighborIfContents() {
        trackGet(this, "booleanProp");
        return new CompiledTemplateResult($template_11, [
            this.booleanProp ? new CompiledTemplateResult($template_12, [], this) : null
        ], this);
    }
}
