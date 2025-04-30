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
    let $com_0 = new ChildComponent($node_0);
    let $binding_0 = new RefBinding($node_0, $context, ["com"]);
    $binding_0.update(function (refed) { this.refCom = refed; trackSet(this, "refCom"); });
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        parts: [
            [$binding_0, 1],
            [$com_0, 1]
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
    let $com_0 = new ChildComponent($node_0);
    let $binding_0 = new RefBinding($node_0, $context, ["el"]);
    $binding_0.update(function (refed) { this.refEl = refed; trackSet(this, "refEl"); });
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        parts: [
            [$binding_0, 1],
            [$com_0, 1]
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
    let $com_0 = new ChildComponent($node_0);
    let $binding_0 = new RefBinding($node_0, $context, ["el"]);
    $binding_0.update(function (refed) { this.refElByType = refed; trackSet(this, "refElByType"); });
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        parts: [
            [$binding_0, 1],
            [$com_0, 1]
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
    let $com_0 = new ChildComponent($node_0);
    let $binding_0 = new ClassBinding($node_0);
    let $binding_1 = new RefBinding($node_0, $context, ["binding"]);
    $binding_0.updateString("className");
    $binding_1.update(function (doRef) { this.refBinding = doRef ? $binding_0 : null; trackSet(this, "refBinding"); });
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        parts: [
            [$binding_1, 1],
            [$com_0, 1]
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
    <div :ref=${(el: HTMLElement) => this.refElMethod(el)} />
</root>
*/ const $template_6 = new TemplateMaker(function ($context) {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new RefBinding($node_0, $context, ["el"]);
    $binding_0.update((el) => $context.refElMethod(el));
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
    <div :ref=${(el: HTMLElement) => this.refElMethodWithAdditionalData(el, data)} />
</root>
*/ const $template_7 = new TemplateMaker(function ($context) {
    let $latest_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new RefBinding($node_0, $context, ["el"]);
    $binding_0.update((el) => $context.refElMethodWithAdditionalData(el, $latest_0));
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            $latest_0 = $values[0];
        },
        parts: [
            [$binding_0, 1]
        ]
    };
});
/*
<root>
    <ChildComponent :class="className" :ref.binding=${this.refBindingMethod} />
</root>
*/ const $template_8 = new TemplateMaker(function ($context) {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $com_0 = new ChildComponent($node_0);
    let $binding_0 = new ClassBinding($node_0);
    let $binding_1 = new RefBinding($node_0, $context, ["binding"]);
    $binding_0.updateString("className");
    $binding_1.update(function (doRef) { this.refBindingMethod.call(this, doRef ? $binding_0 : null); });
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        parts: [
            [$binding_1, 1],
            [$com_0, 1]
        ]
    };
});
/*
<root>
    <ChildComponent ?:transition=${this.shouldTransition, fade()} :ref.binding=${this.refBinding} />
</root>
*/ const $template_9 = new TemplateMaker(function ($context) {
    let $latest_0, $latest_1;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $com_0 = new ChildComponent($node_0);
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
/*
<root>
    <div :ref=${value} />
</root>
*/ const $template_10 = new TemplateMaker(function ($context) {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new RefBinding($node_0, $context, ["el"]);
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            $binding_0.update($values[0]);
        },
        parts: [
            [$binding_0, 1]
        ]
    };
});
/*
<root>
    <div :ref=${(el: HTMLElement) => this.refEl[index] = el} />
</root>
*/ const $template_11 = new TemplateMaker(function ($context) {
    let $latest_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new RefBinding($node_0, $context, ["el"]);
    $binding_0.update((el) => {
        trackSet($context.refEl, $latest_0);
        return $context.refEl[$latest_0] = el;
    });
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            $latest_0 = $values[0];
        },
        parts: [
            [$binding_0, 1]
        ]
    };
});
export class TestRefBinding extends Component {
    refEl;
    refCom;
    refElByType;
    refBinding;
    testRefEl() {
        return new CompiledTemplateResult($template_0, [], this);
    }
    testRefCom() {
        return new CompiledTemplateResult($template_1, [], this);
    }
    testRefElModifier() {
        return new CompiledTemplateResult($template_2, [], this);
    }
    testRefElByDeclarationType() {
        return new CompiledTemplateResult($template_3, [], this);
    }
    testRefBinding() {
        return new CompiledTemplateResult($template_4, [], this);
    }
    testRefElMethod() {
        return new CompiledTemplateResult($template_5, [], this);
    }
    testRefElFunction() {
        return new CompiledTemplateResult($template_6, [], this);
    }
    refElMethod(_el) { }
    testRefElFunctionWithAdditionalData() {
        let data;
        return new CompiledTemplateResult($template_7, [
            data
        ], this);
    }
    refElMethodWithAdditionalData(_el, _data) { }
    testRefBindingMethod() {
        return new CompiledTemplateResult($template_8, [], this);
    }
    refBindingMethod(_binding) { }
    shouldTransition = true;
    testRefOptionalBinding() {
        trackGet(this, "shouldTransition");
        return new CompiledTemplateResult($template_9, [
            this.shouldTransition
        ], this);
    }
    testRefAsLocal() {
        let value;
        return new CompiledTemplateResult($template_10, [
            function (refed) { value = refed; }
        ], this);
    }
    testForRefWithIndex() {
        return [1, 2].map((_v, index) => new CompiledTemplateResult($template_11, [
            index
        ], this));
    }
}
class ChildComponent extends Component {
}
