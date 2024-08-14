import { Component, html, StyleBinding, TemplateMaker, SlotPosition, HTMLMaker } from '@pucelle/lupos.js';
import { trackGet } from "@pucelle/ff";
const $html_0 = new HTMLMaker("<div></div>");
const $template_0 = new TemplateMaker($context => {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new StyleBinding($node_0);
    let $latest_0;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        update($values) {
            $latest_0 !== "color: " + $values[0] && $binding_0.updateString($latest_0 = "color: " + $values[0]);
        },
        parts: [$binding_0]
    };
});
const $html_1 = new HTMLMaker("<div></div>");
const $template_1 = new TemplateMaker($context => {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new StyleBinding($node_0);
    let $latest_0;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        update($values) {
            $latest_0 !== $values[0] && $binding_0.updateString($latest_0 = $values[0]);
        },
        parts: [$binding_0]
    };
});
const $html_2 = new HTMLMaker("<div></div>");
const $template_2 = new TemplateMaker($context => {
    let $node = $html_2.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new StyleBinding($node_0);
    let $latest_0;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        update($values) {
            $latest_0 !== $values[0] && $binding_0.updateObject($latest_0 = $values[0]);
        },
        parts: [$binding_0]
    };
});
const $html_3 = new HTMLMaker("<div></div>");
const $template_3 = new TemplateMaker($context => {
    let $node = $html_3.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new StyleBinding($node_0);
    let $latest_0;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $binding_0.updateObject({ color: $values[0] });
                $latest_0 = $values[0];
            }
        },
        parts: [$binding_0]
    };
});
const $html_4 = new HTMLMaker("<div></div>");
const $template_4 = new TemplateMaker($context => {
    let $node = $html_4.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new StyleBinding($node_0);
    let $latest_0;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $binding_0.updateObject({ width: $values[0] + "px" });
                $latest_0 = $values[0];
            }
        },
        parts: [$binding_0]
    };
});
const $html_5 = new HTMLMaker("<div></div>");
const $template_5 = new TemplateMaker($context => {
    let $node = $html_5.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new StyleBinding($node_0);
    let $latest_0;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $binding_0.updateObject({ width: $values[0] + "%" });
                $latest_0 = $values[0];
            }
        },
        parts: [$binding_0]
    };
});
const $html_6 = new HTMLMaker("<div></div>");
const $template_6 = new TemplateMaker($context => {
    let $node = $html_6.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new StyleBinding($node_0);
    let $latest_0;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $binding_0.updateObject({ background: "url(" + $values[0] + ")" });
                $latest_0 = $values[0];
            }
        },
        parts: [$binding_0]
    };
});
const $html_7 = new HTMLMaker("<div></div>");
const $template_7 = new TemplateMaker($context => {
    let $node = $html_7.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new StyleBinding($node_0);
    $binding_0.updateString('className');
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        parts: [$binding_0]
    };
});
const $html_8 = new HTMLMaker("<div></div>");
const $template_8 = new TemplateMaker($context => {
    let $node = $html_8.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new StyleBinding($node_0);
    $binding_0.updateObject(['className']);
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        parts: [$binding_0]
    };
});
const $html_9 = new HTMLMaker("<div></div>");
const $template_9 = new TemplateMaker($context => {
    let $node = $html_9.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new StyleBinding($node_0);
    $binding_0.updateObject({ 'className': true });
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        parts: [$binding_0]
    };
});
const $html_10 = new HTMLMaker("<div></div>");
const $template_10 = new TemplateMaker($context => {
    let $node = $html_10.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new StyleBinding($node_0);
    $binding_0.updateObject({ prop: true });
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        parts: [$binding_0]
    };
});
class TestStyleBinding extends Component {
    styleValue = 'red';
    numericValue = 1;
    testInterpolatedString() {
        trackGet(this, "styleValue");
        return new CompiledTemplateResult($template_0, [this.styleValue]);
    }
    testWholeString() {
        trackGet(this, "styleValue");
        return new CompiledTemplateResult($template_1, [`color: ${this.styleValue}`]);
    }
    testObject() {
        trackGet(this, "styleValue");
        return new CompiledTemplateResult($template_2, [{ color: this.styleValue }]);
    }
    testModifier() {
        trackGet(this, "styleValue");
        return new CompiledTemplateResult($template_3, [this.styleValue]);
    }
    testPxModifier() {
        trackGet(this, "numericValue");
        return new CompiledTemplateResult($template_4, [this.numericValue]);
    }
    testPercentModifier() {
        trackGet(this, "numericValue");
        return new CompiledTemplateResult($template_5, [this.numericValue]);
    }
    testURLModifier() {
        trackGet(this, "styleValue");
        return new CompiledTemplateResult($template_6, [this.styleValue]);
    }
}
class TestStaticStyleBinding extends Component {
    testString() {
        return new CompiledTemplateResult($template_7, []);
    }
    testArray() {
        return new CompiledTemplateResult($template_8, []);
    }
    testObject() {
        return new CompiledTemplateResult($template_9, []);
    }
    testModifier() {
        return new CompiledTemplateResult($template_10, []);
    }
}
