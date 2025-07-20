import { Component, TemplateSlot, SlotPosition, CompiledTemplateResult, TemplateMaker, HTMLMaker, IfBlock } from '@pucelle/lupos.js';
import { trackGet } from "@pucelle/lupos";
const $html_0 = /*#__PURE__*/ new HTMLMaker("<div><!----></div>");
/*
<root>
    <div>
        ${html`<div></div>`}
    </div>
</root>
*/ const $template_0 = /*#__PURE__*/ new TemplateMaker(function ($context) {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node_0.firstChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), 0);
    $slot_0.update(new CompiledTemplateResult($template_1, [], $context));
    return {
        el: $node,
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
*/ const $template_1 = /*#__PURE__*/ new TemplateMaker(function () {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
/*
<root>
    <div>
        ${[html`<div></div>`]}
    </div>
</root>
*/ const $template_2 = /*#__PURE__*/ new TemplateMaker(function ($context) {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node_0.firstChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), 1);
    $slot_0.update([new CompiledTemplateResult($template_3, [], $context)]);
    return {
        el: $node,
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
*/ const $template_3 = /*#__PURE__*/ new TemplateMaker(function () {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
/*
<root>
    <div>
        ${this.booleanProp ? '1' : html`<div></div>`}
    </div>
</root>
*/ const $template_4 = /*#__PURE__*/ new TemplateMaker(function () {
    let $latest_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node_0.firstChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1));
    return {
        el: $node,
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
*/ const $template_5 = /*#__PURE__*/ new TemplateMaker(function () {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_6 = /*#__PURE__*/ new HTMLMaker("<div> <!----> </div>");
/*
<root>
    <div>
        ${'1'}
        ${html`<div></div>`}
         ${'1'}
    </div>
</root>
*/ const $template_6 = /*#__PURE__*/ new TemplateMaker(function ($context) {
    let $node = $html_6.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node_0.firstChild;
    let $node_2 = $node_0.childNodes[1];
    let $node_3 = $node_0.lastChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_2), 0);
    $node_1.data = '1' + " ";
    $slot_0.update(new CompiledTemplateResult($template_7, [], $context));
    $node_3.data = " " + '1';
    return {
        el: $node,
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
*/ const $template_7 = /*#__PURE__*/ new TemplateMaker(function () {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_8 = /*#__PURE__*/ new HTMLMaker("<div><!----><!----></div>");
/*
<root>
    <div>
        ${html`<div></div>`}
        ${html`<div></div>`}
    </div>
</root>
*/ const $template_8 = /*#__PURE__*/ new TemplateMaker(function ($context) {
    let $node = $html_8.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node_0.firstChild;
    let $node_2 = $node_0.lastChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), 0);
    let $slot_1 = new TemplateSlot(new SlotPosition(1, $node_2), 0);
    $slot_0.update(new CompiledTemplateResult($template_9, [], $context));
    $slot_1.update(new CompiledTemplateResult($template_10, [], $context));
    return {
        el: $node,
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
*/ const $template_9 = /*#__PURE__*/ new TemplateMaker(function () {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
/*
<root>
    <div />
</root>
*/ const $template_10 = /*#__PURE__*/ new TemplateMaker(function () {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_11 = /*#__PURE__*/ new HTMLMaker("<!----><!----><!---->");
/*
<root>
    <template>
        <lu:if ${this.booleanProp} />
        ${html`<div></div>`}
    </template>
</root>
*/ const $template_11 = /*#__PURE__*/ new TemplateMaker(function ($context) {
    let $node = $html_11.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.childNodes[1];
    let $node_2 = $node.content.lastChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1));
    let $block_0 = new IfBlock($slot_0);
    let $slot_1 = new TemplateSlot(new SlotPosition(1, $node_2), 0);
    $slot_1.update(new CompiledTemplateResult($template_13, [], $context));
    return {
        el: $node,
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
*/ const $template_12 = /*#__PURE__*/ new TemplateMaker(function () {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
/*
<root>
    <div />
</root>
*/ const $template_13 = /*#__PURE__*/ new TemplateMaker(function () {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
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
