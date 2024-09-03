import { Component, html, CompiledTemplateResult, TemplateMaker, SlotPosition, HTMLMaker, TemplateSlot } from '@pucelle/lupos.js';
import { trackGet } from "@pucelle/ff";
const $html_0 = new HTMLMaker("<div></div>");
/*
<root>
    <div />
</root>
*/ const $template_0 = new TemplateMaker($context => {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0)
    };
});
/*
<root>
    <div />
</root>
*/ const $template_1 = new TemplateMaker($context => {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_0), $context, 0);
    $slot_0.update(new CompiledTemplateResult($template_0, []));
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        parts: [$slot_0]
    };
});
/*
<root>
    <div />
</root>
*/ const $template_2 = new TemplateMaker($context => {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0)
    };
});
/*
<root>
    <div />
</root>
*/ const $template_3 = new TemplateMaker($context => {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_0), $context, 1);
    $slot_0.update([new CompiledTemplateResult($template_2, [])]);
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        parts: [$slot_0]
    };
});
/*
<root>
    <div />
</root>
*/ const $template_4 = new TemplateMaker($context => {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0)
    };
});
/*
<root>
    <div />
</root>
*/ const $template_5 = new TemplateMaker($context => {
    let $latest_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_0), $context);
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        update($values) {
            $latest_0 !== $values[0] && $slot_0.update($latest_0 = $values[0]);
        },
        parts: [$slot_0]
    };
});
/*
<root>
    <div />
</root>
*/ const $template_6 = new TemplateMaker($context => {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0)
    };
});
const $html_1 = new HTMLMaker("<div> <!----> </div>");
/*
<root>
    <div>


    </div>
</root>
*/ const $template_7 = new TemplateMaker($context => {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node_0.firstChild;
    let $node_2 = $node_0.childNodes[1];
    let $slot_0 = new TemplateSlot(new SlotPosition(2, $node_1), $context, 2);
    let $slot_1 = new TemplateSlot(new SlotPosition(2, $node_2), $context, 0);
    let $slot_2 = new TemplateSlot(new SlotPosition(1, $node_0), $context, 2);
    $slot_0.update('1');
    $slot_1.update(new CompiledTemplateResult($template_6, []));
    $slot_2.update('1');
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        parts: [$slot_0, $slot_1, $slot_2]
    };
});
class TestContent extends Component {
    stringProp = '1';
    numericProp = 1;
    booleanProp = true;
    testTemplateResultContent() {
        return new CompiledTemplateResult($template_1, []);
    }
    testTemplateResultListContent() {
        return new CompiledTemplateResult($template_3, []);
    }
    testMixedContent() {
        trackGet(this, "booleanProp");
        return new CompiledTemplateResult($template_5, [this.booleanProp ? '1' : new CompiledTemplateResult($template_4, [])]);
    }
    testMultipleContents() {
        return new CompiledTemplateResult($template_7, []);
    }
}
