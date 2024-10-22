import { fade, trackGet, trackSet } from '@pucelle/ff';
import { ClassBinding, Component, RefBinding, TransitionBinding, PartDelegator, CompiledTemplateResult, TemplateMaker, SlotPosition, HTMLMaker } from '@pucelle/lupos.js';
const $html_0 = new HTMLMaker("<div></div>");
/*
<root>
    <div :ref=${this.refEl} />
</root>
*/ const $template_0 = new TemplateMaker(function ($context) {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new RefBinding($node_0, $context, ["el"]);
    $binding_0.update(function (refed) { this.refEl = refed; trackSet(this, "refEl"); });
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        parts: [
            [$binding_0, 1]
        ]
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
    let $binding_0 = new RefBinding($node_0, $context, ["com"]);
    $binding_0.update(function (refed) { this.refCom = refed; trackSet(this, "refCom"); });
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        parts: [
            [$com_0, 1],
            [$binding_0, 1]
        ]
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
        parts: [
            [$com_0, 1],
            [$binding_0, 1]
        ]
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
        parts: [
            [$com_0, 1],
            [$binding_0, 1]
        ]
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
    $binding_1.update(function (doRef) { this.refBinding = doRef ? $binding_0 : null; trackSet(this, "refBinding"); });
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        parts: [
            [$com_0, 1],
            [$binding_1, 1]
        ]
    };
});
/*
<root>
    <div :ref=${this.refElMethod} />
</root>
*/ const $template_5 = new TemplateMaker(function ($context) {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new RefBinding($node_0, $context, ["el"]);
    $binding_0.update($context.refElMethod);
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        parts: [
            [$binding_0, 1]
        ]
    };
});
/*
<root>
    <ChildComponent :class="className" :ref.binding=${this.refBindingMethod} />
</root>
*/ const $template_6 = new TemplateMaker(function ($context) {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $com_0 = new ChildComponent({}, $node_0);
    let $binding_0 = new ClassBinding($node_0);
    let $binding_1 = new RefBinding($node_0, $context, ["binding"]);
    $binding_0.updateString("className");
    $binding_1.update(function (doRef) { this.refBindingMethod.call(this, doRef ? $binding_0 : null); });
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        parts: [
            [$com_0, 1],
            [$binding_1, 1]
        ]
    };
});
/*
<root>
    <ChildComponent ?:transition=${this.shouldTransition, fade()} :ref.binding=${this.refBinding} />
</root>
*/ const $template_7 = new TemplateMaker(function ($context) {
    let $latest_0, $latest_1;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $com_0 = new ChildComponent({}, $node_0);
    let $binding_0 = new TransitionBinding($node_0, $context);
    let $delegator_0 = new PartDelegator();
    let $binding_1 = new RefBinding($node_0, $context, ["binding"]);
    let $delegator_1 = new PartDelegator();
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($values[0] && !$latest_0) {
                $binding_0.update(fade());
                $delegator_0.update($binding_0);
                $latest_0 = $values[0];
            }
            else if (!$values[0] && $latest_0) {
                $delegator_0.update(null);
                $latest_0 = $values[0];
            }
            if ($values[0] && !$latest_1) {
                $binding_1.update(function (doRef) { this.refBinding = doRef ? $binding_0 : null; trackSet(this, "refBinding"); });
                $delegator_1.update($binding_1);
                $latest_1 = $values[0];
            }
            else if (!$values[0] && $latest_1) {
                $delegator_1.update(null);
                $latest_1 = $values[0];
            }
        },
        parts: [
            [$com_0, 1],
            [$delegator_0, 1],
            [$delegator_1, 1]
        ]
    };
});
export class TestRefBinding extends Component {
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
    testRefElMethod() {
        return new CompiledTemplateResult($template_5, []);
    }
    refElMethod(_el) { }
    testRefBindingMethod() {
        return new CompiledTemplateResult($template_6, []);
    }
    refBindingMethod(_binding) { }
    shouldTransition = true;
    testRefOptionalBinding() {
        trackGet(this, "shouldTransition");
        return new CompiledTemplateResult($template_7, [
            this.shouldTransition
        ]);
    }
}
class ChildComponent extends Component {
}
