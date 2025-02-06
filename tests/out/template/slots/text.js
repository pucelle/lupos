import { Component, CompiledTemplateResult, TemplateMaker, SlotPosition, HTMLMaker } from '@pucelle/lupos.js';
import { trackGet } from "@pucelle/ff";
const $html_0 = new HTMLMaker("<div> </div>");
/*
<root>
    <div>${'abc'}</div>
</root>
*/ const $template_0 = new TemplateMaker(function () {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node_0.firstChild;
    $node_1.data = 'abc';
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
/*
<root>
    <div>${this.stringProp}</div>
</root>
*/ const $template_1 = new TemplateMaker(function () {
    let $latest_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node_0.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $node_1.data = $values[0];
                $latest_0 = $values[0];
            }
        }
    };
});
/*
<root>
    <div>${this.getStringProp()}</div>
</root>
*/ const $template_2 = new TemplateMaker(function () {
    let $latest_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node_0.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $node_1.data = $values[0];
                $latest_0 = $values[0];
            }
        }
    };
});
/*
<root>
    <div>${this.numericProp}</div>
</root>
*/ const $template_3 = new TemplateMaker(function () {
    let $latest_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node_0.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $node_1.data = $values[0];
                $latest_0 = $values[0];
            }
        }
    };
});
export class TestText extends Component {
    stringProp = '1';
    numericProp = 1;
    getStringProp() {
        trackGet(this, "stringProp");
        return this.stringProp;
    }
    testStaticText() {
        return new CompiledTemplateResult($template_0, [], this);
    }
    testStringProp() {
        trackGet(this, "stringProp");
        return new CompiledTemplateResult($template_1, [
            this.stringProp
        ], this);
    }
    testStringMethod() {
        return new CompiledTemplateResult($template_2, [
            this.getStringProp()
        ], this);
    }
    testNumericProp() {
        trackGet(this, "numericProp");
        return new CompiledTemplateResult($template_3, [
            this.numericProp
        ], this);
    }
}
