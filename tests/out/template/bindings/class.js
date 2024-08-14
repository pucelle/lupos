import { Component, html, ClassBinding, TemplateMaker, SlotPosition, HTMLMaker } from '@pucelle/lupos.js';
import { trackGet } from "@pucelle/ff";
const $html_0 = new HTMLMaker("<div></div>");
const $template_0 = new TemplateMaker($context => {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $latest_0;
    let $binding_0 = new ClassBinding($node_0);
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        update($values) {
            $latest_0 !== $values[0] && $binding_0.updateString($latest_0 = $values[0]);
        },
        parts: [$binding_0]
    };
});
const $html_1 = new HTMLMaker("<div></div>");
const $template_1 = new TemplateMaker($context => {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    let $latest_0;
    let $binding_0 = new ClassBinding($node_0);
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        update($values) {
            $latest_0 !== $values[0] && $binding_0.updateList($latest_0 = $values[0]);
        },
        parts: [$binding_0]
    };
});
const $html_2 = new HTMLMaker("<div></div>");
const $template_2 = new TemplateMaker($context => {
    let $node = $html_2.make();
    let $node_0 = $node.content.firstChild;
    let $latest_0;
    let $binding_0 = new ClassBinding($node_0);
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
    let $latest_0;
    let $binding_0 = new ClassBinding($node_0);
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $binding_0.updateObject({ prop: $values[0] });
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
    let $binding_0 = new ClassBinding($node_0);
    $binding_0.updateString('className');
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        parts: [$binding_0]
    };
});
const $html_5 = new HTMLMaker("<div></div>");
const $template_5 = new TemplateMaker($context => {
    let $node = $html_5.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new ClassBinding($node_0);
    $binding_0.updateList(['className']);
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        parts: [$binding_0]
    };
});
const $html_6 = new HTMLMaker("<div></div>");
const $template_6 = new TemplateMaker($context => {
    let $node = $html_6.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new ClassBinding($node_0);
    $binding_0.updateObject({ 'className': true });
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        parts: [$binding_0]
    };
});
const $html_7 = new HTMLMaker("<div></div>");
const $template_7 = new TemplateMaker($context => {
    let $node = $html_7.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new ClassBinding($node_0);
    $binding_0.updateObject({ prop: true });
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        parts: [$binding_0]
    };
});
class TestBinding extends Component {
    className = 'className';
    booleanValue = true;
    testString() {
        trackGet(this, "className");
        return new CompiledTemplateResult($template_0, [this.className]);
    }
    testArray() {
        trackGet(this, "className");
        return new CompiledTemplateResult($template_1, [[this.className]]);
    }
    testObject() {
        trackGet(this, "booleanValue");
        return new CompiledTemplateResult($template_2, [{ 'className': this.booleanValue }]);
    }
    testModifier() {
        trackGet(this, "booleanValue");
        return new CompiledTemplateResult($template_3, [this.booleanValue]);
    }
}
class TestStaticClassBinding extends Component {
    testString() {
        return new CompiledTemplateResult($template_4, []);
    }
    testArray() {
        return new CompiledTemplateResult($template_5, []);
    }
    testObject() {
        return new CompiledTemplateResult($template_6, []);
    }
    testModifier() {
        return new CompiledTemplateResult($template_7, []);
    }
}
