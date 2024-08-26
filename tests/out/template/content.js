import { Component, html, TemplateMaker, SlotPosition, HTMLMaker, TemplateSlot } from '@pucelle/lupos.js';
import { trackGet } from "@pucelle/ff";
const $html_0 = new HTMLMaker("<div></div>");
const $template_0 = new TemplateMaker($context => {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0)
    };
});
const $template_1 = new TemplateMaker($context => {
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
const $template_2 = new TemplateMaker($context => {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0)
    };
});
const $template_3 = new TemplateMaker($context => {
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
const $html_1 = new HTMLMaker("<div> </div>");
const $template_4 = new TemplateMaker($context => {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node_0.firstChild;
    $node_1.data = 'abc';
    return {
        el: $node,
        position: new SlotPosition(2, $node_0)
    };
});
const $template_5 = new TemplateMaker($context => {
    let $latest_0;
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node_0.firstChild;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $node_1.data = $latest_0 = $values[0];
            }
        }
    };
});
const $template_6 = new TemplateMaker($context => {
    let $latest_0;
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node_0.firstChild;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $node_1.data = $latest_0 = $values[0];
            }
        }
    };
});
const $template_7 = new TemplateMaker($context => {
    let $latest_0;
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node_0.firstChild;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $node_1.data = $latest_0 = $values[0];
            }
        }
    };
});
const $template_8 = new TemplateMaker($context => {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0)
    };
});
const $template_9 = new TemplateMaker($context => {
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
const $template_10 = new TemplateMaker($context => {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0)
    };
});
const $template_11 = new TemplateMaker($context => {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node_0.firstChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(2, $node_1), $context);
    let $slot_1 = new TemplateSlot(new SlotPosition(1, $node_0), $context, 0);
    $slot_0.update('1');
    $slot_1.update(new CompiledTemplateResult($template_10, []));
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        parts: [$slot_0, $slot_1]
    };
});
class TestContent extends Component {
    stringProp = '1';
    numericProp = 1;
    booleanProp = true;
    getStringProp() {
        trackGet(this, "stringProp");
        return this.stringProp;
    }
    testTemplateResultContent() {
        return new CompiledTemplateResult($template_1, []);
    }
    testTemplateResultListContent() {
        return new CompiledTemplateResult($template_3, []);
    }
    testTextContent() {
        return new CompiledTemplateResult($template_4, []);
    }
    testStringContent() {
        trackGet(this, "stringProp");
        return new CompiledTemplateResult($template_5, [this.stringProp]);
    }
    testStringMethodContent() {
        return new CompiledTemplateResult($template_6, [this.getStringProp()]);
    }
    testNumericContent() {
        trackGet(this, "numericProp");
        return new CompiledTemplateResult($template_7, [this.numericProp]);
    }
    testMixedContent() {
        trackGet(this, "booleanProp");
        return new CompiledTemplateResult($template_9, [this.booleanProp ? '1' : new CompiledTemplateResult($template_8, [])]);
    }
    testMultipleContents() {
        return new CompiledTemplateResult($template_11, []);
    }
}
