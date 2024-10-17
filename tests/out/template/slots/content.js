import { Component, CompiledTemplateResult, TemplateMaker, SlotPosition, HTMLMaker, TemplateSlot } from '@pucelle/lupos.js';
import { trackGet } from "@pucelle/ff";
const $html_0 = new HTMLMaker("<div></div>");
/*
<root>
    <div />
</root>
*/ const $template_0 = new TemplateMaker(function () {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_1 = new HTMLMaker("<div><!----></div>");
/*
<root>
    <div>
        ${html`<div></div>`}
    </div>
</root>
*/ const $template_1 = new TemplateMaker(function ($context) {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node_0.firstChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), $context, 0);
    $slot_0.update(new CompiledTemplateResult($template_0, []));
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
*/ const $template_2 = new TemplateMaker(function () {
    let $node = $html_0.make();
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
*/ const $template_3 = new TemplateMaker(function ($context) {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node_0.firstChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), $context, 1);
    $slot_0.update([new CompiledTemplateResult($template_2, [])]);
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
*/ const $template_4 = new TemplateMaker(function () {
    let $node = $html_0.make();
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
*/ const $template_5 = new TemplateMaker(function ($context) {
    let $latest_0;
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node_0.firstChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), $context);
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
*/ const $template_6 = new TemplateMaker(function () {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_7 = new HTMLMaker("<div> <!----> </div>");
/*
<root>
    <div>
        ${'1'}
        ${html`<div></div>`}
         ${'1'}
    </div>
</root>
*/ const $template_7 = new TemplateMaker(function ($context) {
    let $node = $html_7.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node_0.firstChild;
    let $node_2 = $node_0.childNodes[1];
    let $node_3 = $node_0.lastChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_2), $context, 0);
    $node_1.data = '1' + " ";
    $slot_0.update(new CompiledTemplateResult($template_6, []));
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
*/ const $template_8 = new TemplateMaker(function () {
    let $node = $html_0.make();
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
*/ const $template_9 = new TemplateMaker(function () {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_10 = new HTMLMaker("<div><!----><!----></div>");
/*
<root>
    <div>
        ${html`<div></div>`}
        ${html`<div></div>`}
    </div>
</root>
*/ const $template_10 = new TemplateMaker(function ($context) {
    let $node = $html_10.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node_0.firstChild;
    let $node_2 = $node_0.lastChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), $context, 0);
    let $slot_1 = new TemplateSlot(new SlotPosition(1, $node_2), $context, 0);
    $slot_0.update(new CompiledTemplateResult($template_8, []));
    $slot_1.update(new CompiledTemplateResult($template_9, []));
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        parts: [
            [$slot_0, 0],
            [$slot_1, 0]
        ]
    };
});
class TestContent extends Component {
    booleanProp = true;
    testTemplateResultContent() {
        return new CompiledTemplateResult($template_1, []);
    }
    testTemplateResultListContent() {
        return new CompiledTemplateResult($template_3, []);
    }
    testMixedContent() {
        trackGet(this, "booleanProp");
        return new CompiledTemplateResult($template_5, [
            this.booleanProp ? '1' : new CompiledTemplateResult($template_4, [])
        ]);
    }
    testMultipleContents() {
        return new CompiledTemplateResult($template_7, []);
    }
    testNeighborContents() {
        return new CompiledTemplateResult($template_10, []);
    }
}
