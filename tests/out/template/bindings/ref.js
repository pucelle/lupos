import { Component, html, RefBinding, CompiledTemplateResult, TemplateMaker, SlotPosition, HTMLMaker } from '@pucelle/lupos.js';
import { trackGet } from "@pucelle/ff";
const $html_0 = new HTMLMaker("<div></div>");
/*
<root>
    <div :ref=${this.refEl} />
</root>
*/ const $template_0 = new TemplateMaker($context => {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new RefBinding($node_0, $context);
    $binding_0.update(refed => this.refEl = refed);
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        parts: [$binding_0]
    };
});
/*
<root>
    <ChildComponent :ref=${this.refCom} />
</root>
*/ const $template_1 = new TemplateMaker($context => {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $com_0 = new ChildComponent($node_0);
    let $binding_0 = new RefBinding($node_0, $context);
    $binding_0.update(refed => this.refCom = refed);
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        parts: [$com_0, $binding_0]
    };
});
/*
<root>
    <ChildComponent :ref.el=${this.refEl} />
</root>
*/ const $template_2 = new TemplateMaker($context => {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $com_0 = new ChildComponent($node_0);
    let $binding_0 = new RefBinding($node_0, $context, ["el"]);
    $binding_0.update(refed => this.refEl = refed);
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        parts: [$com_0, $binding_0]
    };
});
/*
<root>
    <ChildComponent :ref=${this.refElByType} />
</root>
*/ const $template_3 = new TemplateMaker($context => {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $com_0 = new ChildComponent($node_0);
    let $binding_0 = new RefBinding($node_0, $context, ["el"]);
    $binding_0.update(refed => this.refElByType = refed);
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        parts: [$com_0, $binding_0]
    };
});
class TestRefBinding extends Component {
    refEl;
    refCom;
    refElByType;
    testRefEl() {
        trackGet(this, "refEl");
        return new CompiledTemplateResult($template_0, []);
    }
    testRefCom() {
        trackGet(this, "refCom");
        return new CompiledTemplateResult($template_1, []);
    }
    testRefElModifier() {
        trackGet(this, "refEl");
        return new CompiledTemplateResult($template_2, []);
    }
    testRefElByDeclarationType() {
        trackGet(this, "refElByType");
        return new CompiledTemplateResult($template_3, []);
    }
}
class ChildComponent extends Component {
}
