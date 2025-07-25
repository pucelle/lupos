import { fade, Component, TransitionBinding, PartDelegator, CompiledTemplateResult, TemplateMaker, SlotPosition, HTMLMaker } from '@pucelle/lupos.js';
import { trackGet } from "@pucelle/lupos";
const $html_0 = /*#__PURE__*/ new HTMLMaker("<div></div>");
/*
<root>
    <div :transition=${fade({duration: this.duration})} />
</root>
*/ const $template_0 = /*#__PURE__*/ new TemplateMaker(function ($context) {
    let $latest_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new TransitionBinding($node_0, $context);
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $binding_0.update($values[0]);
                $latest_0 = $values[0];
            }
        },
        parts: [
            [$binding_0, 1]
        ]
    };
});
/*
<root>
    <div :transition=${fade({duration: 300})} />
</root>
*/ const $template_1 = /*#__PURE__*/ new TemplateMaker(function ($context) {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new TransitionBinding($node_0, $context);
    $binding_0.update(fade({ duration: 300 }));
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
    <div ?:transition=${this.duration, fade({duration: this.duration})} />
</root>
*/ const $template_2 = /*#__PURE__*/ new TemplateMaker(function ($context) {
    let $latest_0, $latest_1;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new TransitionBinding($node_0, $context);
    let $delegator_0 = new PartDelegator();
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($values[0]) {
                if ($latest_1 !== $values[1]) {
                    $binding_0.update($values[1]);
                    $latest_1 = $values[1];
                }
            }
            if ($values[0] && !$latest_0) {
                $delegator_0.update($binding_0);
                $latest_0 = $values[0];
            }
            else if (!$values[0] && $latest_0) {
                $delegator_0.update(null);
                $latest_0 = $values[0];
            }
        },
        parts: [
            [$delegator_0, 1]
        ]
    };
});
/*
<root>
    <div ?:transition=${this.duration, fade({duration: 3000})} />
</root>
*/ const $template_3 = /*#__PURE__*/ new TemplateMaker(function ($context) {
    let $latest_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new TransitionBinding($node_0, $context);
    let $delegator_0 = new PartDelegator();
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($values[0] && !$latest_0) {
                $binding_0.update(fade({ duration: 3000 }));
                $delegator_0.update($binding_0);
                $latest_0 = $values[0];
            }
            else if (!$values[0] && $latest_0) {
                $delegator_0.update(null);
                $latest_0 = $values[0];
            }
        },
        parts: [
            [$delegator_0, 1]
        ]
    };
});
export class TestTransitionBinding extends Component {
    duration = 300;
    testTransition() {
        trackGet(this, "duration");
        return new CompiledTemplateResult($template_0, [
            fade({ duration: this.duration })
        ], this);
    }
    testStaticTransition() {
        return new CompiledTemplateResult($template_1, [], this);
    }
    withQueryToken() {
        trackGet(this, "duration");
        return new CompiledTemplateResult($template_2, [
            this.duration, fade({ duration: this.duration })
        ], this);
    }
    withQueryTokenAndStaticContent() {
        trackGet(this, "duration");
        return new CompiledTemplateResult($template_3, [
            this.duration
        ], this);
    }
}
