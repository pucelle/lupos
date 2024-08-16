import { Component, html, ClassBinding, TemplateMaker, SlotPosition, HTMLMaker } from '@pucelle/lupos.js';
import { trackGet } from "@pucelle/ff";
const $html_0 = new HTMLMaker("<div></div>");
const $template_0 = new TemplateMaker($context => {
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
const $html_1 = new HTMLMaker("<div></div>");
const $template_1 = new TemplateMaker($context => {
    let $latest_0;
    let $node = $html_1.make();
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
const $html_2 = new HTMLMaker("<div></div>");
const $template_2 = new TemplateMaker($context => {
    let $latest_0;
    let $node = $html_2.make();
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
