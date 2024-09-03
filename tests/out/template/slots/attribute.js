import { Component, html, CompiledTemplateResult, TemplateMaker, SlotPosition, HTMLMaker } from '@pucelle/lupos.js';
import { trackGet } from "@pucelle/ff";
const $html_0 = new HTMLMaker("<div></div>");
/*
<root>
    <div class=${this.className} className2 />
</root>
*/ const $template_0 = new TemplateMaker($context => {
    let $latest_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        update($values) {
            if ($latest_0 !== $values[0] + " className2") {
                $node_0.setAttribute("class", $latest_0 = $values[0] + " className2");
            }
        }
    };
});
/*
<root>
    <div class=${this.className} />
</root>
*/ const $template_1 = new TemplateMaker($context => {
    let $latest_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $node_0.setAttribute("class", $latest_0 = $values[0]);
            }
        }
    };
});
/*
<root>
    <div class=${this.nullableClassName} />
</root>
*/ const $template_2 = new TemplateMaker($context => {
    let $latest_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        update($values) {
            if ($latest_0 === $values[0]) {
                $values[0] === null ? $node_0.removeAttribute("class") : $node_0.setAttribute("class", $values[0]);
                $latest_0 = $values[0];
            }
        }
    };
});
class TestAttribute extends Component {
    className = 'className';
    booleanValue = true;
    nullableClassName;
    testInterpolatedString() {
        trackGet(this, "className");
        return new CompiledTemplateResult($template_0, [this.className]);
    }
    testString() {
        trackGet(this, "className");
        return new CompiledTemplateResult($template_1, [this.className]);
    }
    testNullableAttr() {
        trackGet(this, "nullableClassName");
        return new CompiledTemplateResult($template_2, [this.nullableClassName]);
    }
}
