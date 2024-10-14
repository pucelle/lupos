import { fade, trackSet, trackGet } from '@pucelle/ff';
import { ClassBinding, Component, TransitionBinding, PartDelegator, RefBinding, CompiledTemplateResult, TemplateMaker, SlotPosition, HTMLMaker } from '@pucelle/lupos.js';
const $html_0 = new HTMLMaker("<div></div>");
/*
<root>
    <ChildComponent ?:transition=${this.shouldTransition, fade()} :ref.binding=${this.refBinding} />
</root>
*/ const $template_0 = new TemplateMaker(function ($context) {
    let $latest_0;
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
            if ($values[1] && !$latest_0) {
                $binding_0.update(fade());
                $delegator_0.update($binding_0);
                $latest_0 = $values[1];
            }
            else if (!$values[1] && $latest_0) {
                $delegator_0.update(null);
                $latest_0 = $values[1];
            }
        },
        parts: [
            [$com_0, 1],
            [$delegator_0, 1],
            [$delegator_1, 1]
        ]
    };
});
class TestRefBinding extends Component {
    refEl;
    refCom;
    refElByType;
    refBinding;
    // testRefEl() {
    // 	return html`<div :ref=${this.refEl} />`
    // }
    // testRefCom() {
    // 	return html`<ChildComponent :ref=${this.refCom} />`
    // }
    // testRefElModifier() {
    // 	return html`<ChildComponent :ref.el=${this.refEl} />`
    // }
    // testRefElByDeclarationType() {
    // 	return html`<ChildComponent :ref=${this.refElByType} />`
    // }
    // testRefBinding() {
    // 	return html`<ChildComponent :class="className" :ref.binding=${this.refBinding} />`
    // }
    // testRefElMethod() {
    // 	return html`<div :ref=${this.refElMethod} />`
    // }
    // refElMethod(_el: HTMLElement) {}
    // testRefBindingMethod() {
    // 	return html`<ChildComponent :class="className" :ref.binding=${this.refBindingMethod} />`
    // }
    // refBindingMethod(_binding: ClassBinding) {}
    shouldTransition = true;
    testRefOptionalBinding() {
        trackGet(this, "shouldTransition");
        return new CompiledTemplateResult($template_0, [
            this.refBinding,
            this.shouldTransition
        ]);
    }
}
class ChildComponent extends Component {
}
