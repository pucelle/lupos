import { Component, html, TemplateMaker, SlotPosition, HTMLMaker } from '@pucelle/lupos.js';
import { trackGet } from "@pucelle/ff";
const $html_0 = new HTMLMaker("<div></div>");
const $template_0 = new TemplateMaker($context => {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    $node_0.setAttribute("attr", 'className');
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
            if ($latest_0 !== $values[0]) {
                $node_0.setAttribute("attr", $latest_0 = $values[0]);
            }
        }
    };
});
const $template_2 = new TemplateMaker($context => {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    $node_0.setAttribute("attr", this.readonlyProp);
    return {
        el: $node,
        position: new SlotPosition(2, $node_0)
    };
});
const $template_3 = new TemplateMaker($context => {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    $node_0.prop = this.getValue;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0)
    };
});
const $template_4 = new TemplateMaker($context => {
    let $latest_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $node_0.setAttribute("attr", $latest_0 = $values[0]);
            }
        }
    };
});
const $template_5 = new TemplateMaker($context => {
    let $latest_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        update($values) {
            if ($latest_0 !== "name1 " + $values[0] + " name2 " + $values[0]) {
                $node_0.setAttribute("attr", $latest_0 = "name1 " + $values[0] + " name2 " + $values[0]);
            }
        }
    };
});
const $template_6 = new TemplateMaker($context => {
    let $latest_0, $latest_1;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        update($values) {
            if ($latest_0 !== "" + $values[0]) {
                $node_0.setAttribute("attr", $latest_0 = "" + $values[0]);
            }
            if ($latest_1 !== $values[0]) {
                $node_0.setAttribute("attr2", $latest_1 = $values[0]);
            }
        }
    };
});
class TestTemplateValues extends Component {
    prop = 1;
    readonlyProp = 1;
    testStatic() {
        return new CompiledTemplateResult($template_0, []);
    }
    testMutable() {
        trackGet(this, "prop");
        return new CompiledTemplateResult($template_1, [this.prop]);
    }
    testReadonlyPropMutable() {
        return new CompiledTemplateResult($template_2, []);
    }
    testMethodMutable() {
        return new CompiledTemplateResult($template_3, []);
    }
    testMethodCallingMutable() {
        return new CompiledTemplateResult($template_4, [this.getValue()]);
    }
    getValue() {
        return '';
    }
    testBundlingStringAndValues() {
        trackGet(this, "prop");
        return new CompiledTemplateResult($template_5, [this.prop]);
    }
    testMergingSameValues() {
        trackGet(this, "prop");
        return new CompiledTemplateResult($template_6, [this.prop]);
    }
}
