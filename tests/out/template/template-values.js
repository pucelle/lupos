import { Component, html, ClassBinding, TemplateMaker, SlotPosition, HTMLMaker } from '@pucelle/lupos.js';
import { trackGet } from "@pucelle/ff";
const $html_0 = new HTMLMaker("<div></div>");
const $template_0 = new TemplateMaker($context => {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    $node_0.setAttribute("class", 'className');
    return {
        el: $node,
        position: new SlotPosition(2, $node_0)
    };
});
const $template_1 = new TemplateMaker($context => {
    let $latest_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        update($values) {
            if ($latest_0 !== "" + $values[0]) {
                $node_0.setAttribute("class", $latest_0 = "" + $values[0]);
            }
        }
    };
});
const $template_2 = new TemplateMaker($context => {
    let $latest_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        update($values) {
            if ($latest_0 !== "name1 " + $values[0] + " name2 " + $values[0]) {
                $node_0.setAttribute("class", $latest_0 = "name1 " + $values[0] + " name2 " + $values[0]);
            }
        }
    };
});
const $template_3 = new TemplateMaker($context => {
    let $latest_0, $latest_1;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new ClassBinding($node_0);
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        update($values) {
            if ($latest_0 !== "" + $values[0]) {
                $node_0.setAttribute("class", $latest_0 = "" + $values[0]);
            }
            if ($latest_1 !== $values[0]) {
                $binding_0.updateString($latest_1 = $values[0]);
            }
        },
        parts: [$binding_0]
    };
});
class TestTemplateValues extends Component {
    prop = 1;
    testStatic() {
        return new CompiledTemplateResult($template_0, []);
    }
    testMutable() {
        trackGet(this, "prop");
        return new CompiledTemplateResult($template_1, [this.prop]);
    }
    testBundlingStringAndValues() {
        trackGet(this, "prop");
        return new CompiledTemplateResult($template_2, [this.prop]);
    }
    testMergingSameValues() {
        trackGet(this, "prop");
        return new CompiledTemplateResult($template_3, [this.prop]);
    }
}
