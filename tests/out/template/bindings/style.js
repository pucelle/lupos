import { Component, StyleBinding, CompiledTemplateResult, TemplateMaker, SlotPosition, HTMLMaker } from '@pucelle/lupos.js';
import { trackGet } from "@pucelle/lupos";
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
            if ($latest_0 !== $values[0]) {
                $binding_0.updateString("color: " + $values[0]);
                $latest_0 = $values[0];
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
                $binding_0.updateString($values[0]);
                $latest_0 = $values[0];
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
            if ($latest_0 !== $values[0]) {
                $binding_0.updateString("" + $values[0]);
                $latest_0 = $values[0];
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
                $binding_0.updateObject($values[0]);
                $latest_0 = $values[0];
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
                $binding_0.updateObject({ width: $values[0] + "px" });
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
                $binding_0.updateObject({ width: $values[0] + "%" });
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
                $binding_0.updateObject({ background: "url(" + $values[0] + ")" });
                $latest_0 = $values[0];
            }
        }
    };
});
/*
<root>
    <div style="background: ${this.styleValue}" :style.background=${this.styleValue} />
</root>
*/ const $template_8 = new TemplateMaker(function () {
    let $latest_0, $latest_1;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new StyleBinding($node_0);
    let $binding_1 = new StyleBinding($node_0);
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $binding_0.updateString("background: " + $values[0]);
                $latest_0 = $values[0];
            }
            if ($latest_1 !== $values[0]) {
                $binding_1.updateObject({ background: $values[0] });
                $latest_1 = $values[0];
            }
        }
    };
});
/*
<root>
    <div :style="color: ${'red'}" />
</root>
*/ const $template_9 = new TemplateMaker(function () {
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
*/ const $template_10 = new TemplateMaker(function () {
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
*/ const $template_11 = new TemplateMaker(function () {
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
*/ const $template_12 = new TemplateMaker(function () {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new StyleBinding($node_0);
    $binding_0.updateObject({ prop: true });
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
export class TestStyleBinding extends Component {
    styleValue = 'red';
    numericValue = 1;
    testInterpolatedString() {
        trackGet(this, "styleValue");
        return new CompiledTemplateResult($template_0, [
            this.styleValue
        ], this);
    }
    testString() {
        trackGet(this, "styleValue");
        return new CompiledTemplateResult($template_1, [
            `color: ${this.styleValue}`
        ], this);
    }
    testQuoted() {
        trackGet(this, "numericValue");
        return new CompiledTemplateResult($template_2, [
            this.numericValue
        ], this);
    }
    testObject() {
        trackGet(this, "styleValue");
        return new CompiledTemplateResult($template_3, [
            { color: this.styleValue }
        ], this);
    }
    testModifier() {
        trackGet(this, "styleValue");
        return new CompiledTemplateResult($template_4, [
            this.styleValue
        ], this);
    }
    testPxModifier() {
        trackGet(this, "numericValue");
        return new CompiledTemplateResult($template_5, [
            this.numericValue
        ], this);
    }
    testPercentModifier() {
        trackGet(this, "numericValue");
        return new CompiledTemplateResult($template_6, [
            this.numericValue
        ], this);
    }
    testURLModifier() {
        trackGet(this, "styleValue");
        return new CompiledTemplateResult($template_7, [
            this.styleValue
        ], this);
    }
    testConflictWithStyleAttr() {
        trackGet(this, "styleValue");
        return new CompiledTemplateResult($template_8, [
            this.styleValue
        ], this);
    }
}
export class TestStaticStyleBinding extends Component {
    testInterpolatedString() {
        return new CompiledTemplateResult($template_9, [], this);
    }
    testString() {
        return new CompiledTemplateResult($template_10, [], this);
    }
    testObject() {
        return new CompiledTemplateResult($template_11, [], this);
    }
    testModifier() {
        return new CompiledTemplateResult($template_12, [], this);
    }
}
