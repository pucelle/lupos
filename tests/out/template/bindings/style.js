import { Component, StyleBinding, CompiledTemplateResult, TemplateMaker, SlotPosition, HTMLMaker } from '@pucelle/lupos.js';
import { trackGet } from "@pucelle/ff";
const $html_0 = new HTMLMaker("<div></div>");
/*
<root>
    <div :style="color: ${this.styleValue}" />
</root>
*/ const $template_0 = new TemplateMaker(function () {
    let $latest_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new StyleBinding($node_0);
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($latest_0 !== "color: " + $values[0]) {
                $binding_0.updateString($latest_0 = "color: " + $values[0]);
            }
        }
    };
});
/*
<root>
    <div :style=${`color: ${this.styleValue}`} />
</root>
*/ const $template_1 = new TemplateMaker(function () {
    let $latest_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new StyleBinding($node_0);
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $binding_0.updateString($latest_0 = $values[0]);
            }
        }
    };
});
/*
<root>
    <div :style="${this.numericValue}" />
</root>
*/ const $template_2 = new TemplateMaker(function () {
    let $latest_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new StyleBinding($node_0);
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($latest_0 !== "" + $values[0]) {
                $binding_0.updateString($latest_0 = "" + $values[0]);
            }
        }
    };
});
/*
<root>
    <div :style=${{color: this.styleValue}} />
</root>
*/ const $template_3 = new TemplateMaker(function () {
    let $latest_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new StyleBinding($node_0);
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $binding_0.updateObject($latest_0 = $values[0]);
            }
        }
    };
});
/*
<root>
    <div :style.background-color=${this.styleValue} />
</root>
*/ const $template_4 = new TemplateMaker(function () {
    let $latest_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new StyleBinding($node_0);
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $binding_0.updateObject({ "background-color": $values[0] });
                $latest_0 = $values[0];
            }
        }
    };
});
/*
<root>
    <div :style.width.px=${this.numericValue} />
</root>
*/ const $template_5 = new TemplateMaker(function () {
    let $latest_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new StyleBinding($node_0);
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $binding_0.updateObject({ "width": $values[0] + "px" });
                $latest_0 = $values[0];
            }
        }
    };
});
/*
<root>
    <div :style.width.percent=${this.numericValue} />
</root>
*/ const $template_6 = new TemplateMaker(function () {
    let $latest_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new StyleBinding($node_0);
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $binding_0.updateObject({ "width": $values[0] + "%" });
                $latest_0 = $values[0];
            }
        }
    };
});
/*
<root>
    <div :style.background.url=${this.styleValue} />
</root>
*/ const $template_7 = new TemplateMaker(function () {
    let $latest_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new StyleBinding($node_0);
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $binding_0.updateObject({ "background": "url(" + $values[0] + ")" });
                $latest_0 = $values[0];
            }
        }
    };
});
/*
<root>
    <div :style="color: ${'red'}" />
</root>
*/ const $template_8 = new TemplateMaker(function () {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new StyleBinding($node_0);
    $binding_0.updateString("color: " + 'red');
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
/*
<root>
    <div :style=${'styleValue'} />
</root>
*/ const $template_9 = new TemplateMaker(function () {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new StyleBinding($node_0);
    $binding_0.updateString('styleValue');
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
/*
<root>
    <div :style=${{styleName: 'styleValue'}} />
</root>
*/ const $template_10 = new TemplateMaker(function () {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new StyleBinding($node_0);
    $binding_0.updateObject({ styleName: 'styleValue' });
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
/*
<root>
    <div :style.prop=${true} />
</root>
*/ const $template_11 = new TemplateMaker(function () {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new StyleBinding($node_0);
    $binding_0.updateObject({ "prop": true });
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
class TestStyleBinding extends Component {
    styleValue = 'red';
    numericValue = 1;
    testInterpolatedString() {
        trackGet(this, "styleValue");
        return new CompiledTemplateResult($template_0, [this.styleValue]);
    }
    testString() {
        trackGet(this, "styleValue");
        return new CompiledTemplateResult($template_1, [`color: ${this.styleValue}`]);
    }
    testQuoted() {
        trackGet(this, "numericValue");
        return new CompiledTemplateResult($template_2, [this.numericValue]);
    }
    testObject() {
        trackGet(this, "styleValue");
        return new CompiledTemplateResult($template_3, [{ color: this.styleValue }]);
    }
    testModifier() {
        trackGet(this, "styleValue");
        return new CompiledTemplateResult($template_4, [this.styleValue]);
    }
    testPxModifier() {
        trackGet(this, "numericValue");
        return new CompiledTemplateResult($template_5, [this.numericValue]);
    }
    testPercentModifier() {
        trackGet(this, "numericValue");
        return new CompiledTemplateResult($template_6, [this.numericValue]);
    }
    testURLModifier() {
        trackGet(this, "styleValue");
        return new CompiledTemplateResult($template_7, [this.styleValue]);
    }
}
class TestStaticStyleBinding extends Component {
    testInterpolatedString() {
        return new CompiledTemplateResult($template_8, []);
    }
    testString() {
        return new CompiledTemplateResult($template_9, []);
    }
    testObject() {
        return new CompiledTemplateResult($template_10, []);
    }
    testModifier() {
        return new CompiledTemplateResult($template_11, []);
    }
}
