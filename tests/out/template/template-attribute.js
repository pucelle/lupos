import { Component, html, TemplateMaker, SlotPosition, HTMLMaker, TemplateSlot } from '@pucelle/lupos.js';
const $html_0 = new HTMLMaker("<!---->");
const $template_0 = new TemplateMaker($context => {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    $context.el.classList.add("className");
    return {
        el: $node,
        position: new SlotPosition(2, $node_0)
    };
});
const $template_1 = new TemplateMaker($context => {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    $context.el.style["background-color"] = "red";
    return {
        el: $node,
        position: new SlotPosition(2, $node_0)
    };
});
const $template_2 = new TemplateMaker($context => {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    $context.el.setAttribute("attr", "value");
    return {
        el: $node,
        position: new SlotPosition(2, $node_0)
    };
});
const $html_1 = new HTMLMaker("<div></div>");
const $template_3 = new TemplateMaker($context => {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0)
    };
});
const $template_4 = new TemplateMaker($context => {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    $context.el.setAttribute("attr", "value");
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_0), $context, 0);
    $node_0.setAttribute("attr", 'value');
    $slot_0.update(new CompiledTemplateResult($template_3, []));
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        parts: [$slot_0]
    };
});
class TestAttribute extends Component {
    testClass() {
        return new CompiledTemplateResult($template_0, []);
    }
    testStyle() {
        return new CompiledTemplateResult($template_1, []);
    }
    testAttr() {
        return new CompiledTemplateResult($template_2, []);
    }
    testContent() {
        return new CompiledTemplateResult($template_4, []);
    }
}
