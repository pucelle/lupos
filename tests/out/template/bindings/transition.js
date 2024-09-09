import { Component, fade, html, TransitionBinding, CompiledTemplateResult, TemplateMaker, SlotPosition, HTMLMaker } from '@pucelle/lupos.js';
import { trackGet } from "@pucelle/ff";
const $html_0 = new HTMLMaker("<div></div>");
/*
<root>
    <div :transition=${fade({duration: this.duration})} />
</root>
*/ const $template_0 = new TemplateMaker(function ($context) {
    let $latest_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new TransitionBinding($node_0, $context);
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $binding_0.update($latest_0 = $values[0]);
            }
        },
        parts: [$binding_0]
    };
});
/*
<root>
    <div :transition=${fade({duration: 300})} />
</root>
*/ const $template_1 = new TemplateMaker(function ($context) {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new TransitionBinding($node_0, $context);
    $binding_0.update(fade({ duration: 300 }));
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        parts: [$binding_0]
    };
});
class TestTransitionBinding extends Component {
    duration = 300;
    testTransition() {
        trackGet(this, "duration");
        return new CompiledTemplateResult($template_0, [fade({ duration: this.duration })]);
    }
    testStaticTransition() {
        return new CompiledTemplateResult($template_1, []);
    }
}
