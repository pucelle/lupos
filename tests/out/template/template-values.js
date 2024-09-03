import { Component, html, CompiledTemplateResult, TemplateMaker, SlotPosition, HTMLMaker } from '@pucelle/lupos.js';
import { trackGet } from "@pucelle/ff";
const $html_0 = new HTMLMaker("<div></div>");
/*
<root>
    <div attr=${'className'} />
</root>
*/ const $template_0 = new TemplateMaker($context => {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    $node_0.setAttribute("attr", 'className');
    return {
        el: $node,
        position: new SlotPosition(2, $node_0)
    };
});
/*
<root>
    <div attr=${this.prop} />
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
                $node_0.setAttribute("attr", $latest_0 = $values[0]);
            }
        }
    };
});
/*
<root>
    <div attr=${this.readonlyProp} />
</root>
*/ const $template_2 = new TemplateMaker($context => {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    $node_0.setAttribute("attr", $context.readonlyProp);
    return {
        el: $node,
        position: new SlotPosition(2, $node_0)
    };
});
/*
<root>
    <div .prop=${this.getValue} />
</root>
*/ const $template_3 = new TemplateMaker($context => {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    $node_0.prop = $context.getValue;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0)
    };
});
/*
<root>
    <div attr=${this.getValue()} />
</root>
*/ const $template_4 = new TemplateMaker($context => {
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
/*
<root>
    <div @click=${() => this.handleEvent(this.prop)} />
</root>
*/ const $template_5 = new TemplateMaker($context => {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    $node_0.addEventListener("click", (() => $context.handleEvent($context.prop)).bind($context));
    return {
        el: $node,
        position: new SlotPosition(2, $node_0)
    };
});
/*
<root>
    <div @click=${() => this.handleEvent(globalVariable)} />
</root>
*/ const $template_6 = new TemplateMaker($context => {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    $node_0.addEventListener("click", (() => $context.handleEvent(globalVariable)).bind($context));
    return {
        el: $node,
        position: new SlotPosition(2, $node_0)
    };
});
/*
<root>
    <div attr=name1 ${this.prop} name2 $LUPOS_SLOT_INDEX_1$ />
</root>
*/ const $template_7 = new TemplateMaker($context => {
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
/*
<root>
    <div attr=${this.prop} attr2=$LUPOS_SLOT_INDEX_1$ />
</root>
*/ const $template_8 = new TemplateMaker($context => {
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
let globalVariable = 1;
class TestTemplateValues extends Component {
    prop = 1;
    readonlyProp = 1;
    getValue() {
        return '';
    }
    handleEvent(_value) { }
    testStatic() {
        return new CompiledTemplateResult($template_0, []);
    }
    testMutable() {
        trackGet(this, "prop");
        return new CompiledTemplateResult($template_1, [this.prop]);
    }
    testMutableOfReadonlyProp() {
        return new CompiledTemplateResult($template_2, []);
    }
    testMutableOfMethod() {
        return new CompiledTemplateResult($template_3, []);
    }
    testMutableOfCallingMethod() {
        return new CompiledTemplateResult($template_4, [this.getValue()]);
    }
    testMutableOfReferencingProperty() {
        return new CompiledTemplateResult($template_5, []);
    }
    testMutableOfReferencingTopmostVariable() {
        return new CompiledTemplateResult($template_6, []);
    }
    testBundlingStringAndValues() {
        trackGet(this, "prop");
        return new CompiledTemplateResult($template_7, [this.prop]);
    }
    testMergingSameValues() {
        trackGet(this, "prop");
        return new CompiledTemplateResult($template_8, [this.prop]);
    }
}
