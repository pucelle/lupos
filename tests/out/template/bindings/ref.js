import { ClassBinding, Component, RefBinding, CompiledTemplateResult, TemplateMaker, SlotPosition, HTMLMaker } from '@pucelle/lupos.js';
import { trackSet } from "@pucelle/ff";
const $html_0 = new HTMLMaker("<div></div>");
/*
<root>
    <div :ref=${this.refEl} />
</root>
*/ const $template_0 = new TemplateMaker(function ($context) {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new RefBinding($node_0, $context);
    $binding_0.update(function (refed) { this.refEl = refed; trackSet(this, "refEl"); });
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        parts: [[$binding_0, 0]]
    };
});
/*
<root>
    <ChildComponent :ref=${this.refCom} />
</root>
*/ const $template_1 = new TemplateMaker(function ($context) {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $com_0 = new ChildComponent({}, $node_0);
    let $binding_0 = new RefBinding($node_0, $context);
    $binding_0.update(function (refed) { this.refCom = refed; trackSet(this, "refCom"); });
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        parts: [[$com_0, 0], [$binding_0, 0]]
    };
});
/*
<root>
    <ChildComponent :ref.el=${this.refEl} />
</root>
*/ const $template_2 = new TemplateMaker(function ($context) {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $com_0 = new ChildComponent({}, $node_0);
    let $binding_0 = new RefBinding($node_0, $context, ["el"]);
    $binding_0.update(function (refed) { this.refEl = refed; trackSet(this, "refEl"); });
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        parts: [[$com_0, 0], [$binding_0, 0]]
    };
});
/*
<root>
    <ChildComponent :ref=${this.refElByType} />
</root>
*/ const $template_3 = new TemplateMaker(function ($context) {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $com_0 = new ChildComponent({}, $node_0);
    let $binding_0 = new RefBinding($node_0, $context, ["el"]);
    $binding_0.update(function (refed) { this.refElByType = refed; trackSet(this, "refElByType"); });
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        parts: [[$com_0, 0], [$binding_0, 0]]
    };
});
/*
<root>
    <ChildComponent :class="className" :ref.binding=${this.refBinding} />
</root>
*/ const $template_4 = new TemplateMaker(function ($context) {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $com_0 = new ChildComponent({}, $node_0);
    let $binding_0 = new ClassBinding($node_0);
    let $binding_1 = new RefBinding($node_0, $context, ["binding"]);
    $binding_0.updateString("className");
    $binding_1.update(function () { this.refBinding = $binding_0; trackSet(this, "refBinding"); });
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        parts: [[$com_0, 0], [$binding_1, 0]]
    };
});
class TestRefBinding extends Component {
    refEl;
    refCom;
    refElByType;
    refBinding;
    testRefEl() {
        return new CompiledTemplateResult($template_0, []);
    }
    testRefCom() {
        return new CompiledTemplateResult($template_1, []);
    }
    testRefElModifier() {
        return new CompiledTemplateResult($template_2, []);
    }
    testRefElByDeclarationType() {
        return new CompiledTemplateResult($template_3, []);
    }
    testRefBinding() {
        return new CompiledTemplateResult($template_4, []);
    }
}
class ChildComponent extends Component {
}
