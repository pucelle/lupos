import { fade } from '@pucelle/ff';
import { Component, CompiledTemplateResult, TemplateMaker, SlotPosition, HTMLMaker, TransitionBinding, TemplateSlot } from '@pucelle/lupos.js';
const $html_0 = new HTMLMaker("<!---->");
/*
<root>
    <template class="className" />
</root>
*/ const $template_0 = new TemplateMaker(function ($context) {
    let $node = $html_0.make();
    let $node_0 = $context.el;
    let $node_1 = $node.content.firstChild;
    $node_0.classList.add("className");
    return {
        el: $node,
        position: new SlotPosition(1, $node_1)
    };
});
/*
<root>
    <template :transition=${fade()} />
</root>
*/ const $template_1 = new TemplateMaker(function ($context) {
    let $node = $html_0.make();
    let $node_0 = $context.el;
    let $node_1 = $node.content.firstChild;
    let $binding_0 = new TransitionBinding($node_0, $context);
    $binding_0.update(fade());
    return {
        el: $node,
        position: new SlotPosition(1, $node_1),
        parts: [[$binding_0, 2]]
    };
});
/*
<root>
    <template style="background-color: red" />
</root>
*/ const $template_2 = new TemplateMaker(function ($context) {
    let $node = $html_0.make();
    let $node_0 = $context.el;
    let $node_1 = $node.content.firstChild;
    $node_0.style["background-color"] = "red";
    return {
        el: $node,
        position: new SlotPosition(1, $node_1)
    };
});
/*
<root>
    <template attr="value" />
</root>
*/ const $template_3 = new TemplateMaker(function ($context) {
    let $node = $html_0.make();
    let $node_0 = $context.el;
    let $node_1 = $node.content.firstChild;
    $node_0.setAttribute("attr", "value");
    return {
        el: $node,
        position: new SlotPosition(1, $node_1)
    };
});
const $html_4 = new HTMLMaker("<div></div>");
/*
<root>
    <div />
</root>
*/ const $template_4 = new TemplateMaker(function () {
    let $node = $html_4.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_5 = new HTMLMaker("<div><!----></div>");
/*
<root>
    <template attr="value">
        <div attr=${'value'}>
            ${html`<div />`}
        </div>
    </template>
</root>
*/ const $template_5 = new TemplateMaker(function ($context) {
    let $node = $html_5.make();
    let $node_0 = $context.el;
    let $node_1 = $node.content.firstChild;
    let $node_2 = $node_1.firstChild;
    $node_0.setAttribute("attr", "value");
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_2), $context, 0);
    $node_1.setAttribute("attr", 'value');
    $slot_0.update(new CompiledTemplateResult($template_4, []));
    return {
        el: $node,
        position: new SlotPosition(1, $node_1),
        parts: [[$slot_0, 0]]
    };
});
const $html_6 = new HTMLMaker("<div></div><div></div>");
/*
<root>
    <template class="className">
        <div attr=${'value'} />
        <div attr=${'value'} />
    </template>
</root>
*/ const $template_6 = new TemplateMaker(function ($context) {
    let $node = $html_6.make();
    let $node_0 = $context.el;
    let $node_1 = $node.content.firstChild;
    let $node_2 = $node.content.lastChild;
    $node_0.classList.add("className");
    $node_1.setAttribute("attr", 'value');
    $node_2.setAttribute("attr", 'value');
    return {
        el: $node,
        position: new SlotPosition(1, $node_1)
    };
});
class TestAttribute extends Component {
    testClass() {
        return new CompiledTemplateResult($template_0, []);
    }
    testTransition() {
        return new CompiledTemplateResult($template_1, []);
    }
    testStyle() {
        return new CompiledTemplateResult($template_2, []);
    }
    testAttr() {
        return new CompiledTemplateResult($template_3, []);
    }
    testContent() {
        return new CompiledTemplateResult($template_5, []);
    }
    testContents() {
        return new CompiledTemplateResult($template_6, []);
    }
}
