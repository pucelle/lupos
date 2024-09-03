import { Component, html, CompiledTemplateResult, TemplateMaker, SlotPosition, AwaitBlock, TemplateSlot, HTMLMaker } from '@pucelle/lupos.js';
import { trackGet } from "@pucelle/ff";
const $html_0 = new HTMLMaker("<!----><!---->");
/*
<root>
    <lupos:await ${this.promise} />
</root>
*/ const $template_0 = new TemplateMaker($context => {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.lastChild;
    $block_0 = new AwaitBlock([$template_1, $template_2, null], new TemplateSlot(new SlotPosition(2, $node_1), $context));
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        update($values) {
            $block_0.update($values[0], $values);
        }
    };
});
const $html_1 = new HTMLMaker("Pending Content");
/*
<root></root>
*/ const $template_1 = new TemplateMaker($context => {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0)
    };
});
const $html_2 = new HTMLMaker("Then Content");
/*
<root></root>
*/ const $template_2 = new TemplateMaker($context => {
    let $node = $html_2.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0)
    };
});
/*
<root>
    <lupos:await ${this.promise} />
</root>
*/ const $template_3 = new TemplateMaker($context => {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.lastChild;
    $block_0 = new AwaitBlock([$template_4, null, $template_5], new TemplateSlot(new SlotPosition(2, $node_1), $context));
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        update($values) {
            $block_0.update($values[0], $values);
        }
    };
});
/*
<root></root>
*/ const $template_4 = new TemplateMaker($context => {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0)
    };
});
const $html_3 = new HTMLMaker("Catch Content");
/*
<root></root>
*/ const $template_5 = new TemplateMaker($context => {
    let $node = $html_3.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0)
    };
});
/*
<root>
    <lupos:await ${this.promise} />
</root>
*/ const $template_6 = new TemplateMaker($context => {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.lastChild;
    $block_0 = new AwaitBlock([$template_7, $template_8, $template_9], new TemplateSlot(new SlotPosition(2, $node_1), $context));
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        update($values) {
            $block_0.update($values[0], $values);
        }
    };
});
/*
<root></root>
*/ const $template_7 = new TemplateMaker($context => {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0)
    };
});
/*
<root></root>
*/ const $template_8 = new TemplateMaker($context => {
    let $node = $html_2.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0)
    };
});
/*
<root></root>
*/ const $template_9 = new TemplateMaker($context => {
    let $node = $html_3.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0)
    };
});
class TestAwait extends Component {
    promise = Promise.resolve();
    testAwaitThen() {
        trackGet(this, "promise");
        return new CompiledTemplateResult($template_0, [this.promise]);
    }
    testAwaitCatch() {
        trackGet(this, "promise");
        return new CompiledTemplateResult($template_3, [this.promise]);
    }
    testAwaitThenCatch() {
        trackGet(this, "promise");
        return new CompiledTemplateResult($template_6, [this.promise]);
    }
}
