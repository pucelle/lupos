import { Component, ClassBinding, CompiledTemplateResult, TemplateMaker, SlotPosition, HTMLMaker } from '@pucelle/lupos.js';
import { trackGet } from "@pucelle/lupos";
const $html_0 = new HTMLMaker("<div></div>");
/*
<root>
    <div :class="${this.className} className2" />
</root>
*/ const $template_0 = new TemplateMaker(function () {
    let $latest_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new ClassBinding($node_0);
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $binding_0.updateString($values[0] + " className2");
                $latest_0 = $values[0];
            }
        }
    };
});
/*
<root>
    <div :class=${this.className} />
</root>
*/ const $template_1 = new TemplateMaker(function () {
    let $latest_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new ClassBinding($node_0);
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
    <div :class="${this.booleanValue}" />
</root>
*/ const $template_2 = new TemplateMaker(function () {
    let $latest_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new ClassBinding($node_0);
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
    <div :class=${[this.className]} />
</root>
*/ const $template_3 = new TemplateMaker(function () {
    let $latest_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new ClassBinding($node_0);
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $binding_0.updateList($values[0]);
                $latest_0 = $values[0];
            }
        }
    };
});
/*
<root>
    <div :class=${{'className': this.booleanValue}} />
</root>
*/ const $template_4 = new TemplateMaker(function () {
    let $latest_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new ClassBinding($node_0);
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
    <div :class.className=${this.booleanValue} />
</root>
*/ const $template_5 = new TemplateMaker(function () {
    let $latest_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new ClassBinding($node_0);
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $binding_0.updateObject({ className: $values[0] });
                $latest_0 = $values[0];
            }
        }
    };
});
/*
<root>
    <div class=${this.className} :class.className=${this.booleanValue} />
</root>
*/ const $template_6 = new TemplateMaker(function () {
    let $latest_0, $latest_1;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new ClassBinding($node_0);
    let $binding_1 = new ClassBinding($node_0);
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $binding_0.updateString($values[0]);
                $latest_0 = $values[0];
            }
            if ($latest_1 !== $values[1]) {
                $binding_1.updateObject({ className: $values[1] });
                $latest_1 = $values[1];
            }
        }
    };
});
/*
<root>
    <div class="className" :class.className=${this.booleanValue} />
</root>
*/ const $template_7 = new TemplateMaker(function () {
    let $latest_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new ClassBinding($node_0);
    $node_0.classList.add("className");
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $binding_0.updateObject({ className: $values[0] });
                $latest_0 = $values[0];
            }
        }
    };
});
/*
<root>
    <div :class="${'className'} className2" />
</root>
*/ const $template_8 = new TemplateMaker(function () {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new ClassBinding($node_0);
    $binding_0.updateString('className' + " className2");
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
/*
<root>
    <div :class=${'className'} />
</root>
*/ const $template_9 = new TemplateMaker(function () {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new ClassBinding($node_0);
    $binding_0.updateString('className');
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
/*
<root>
    <div :class=${['className']} />
</root>
*/ const $template_10 = new TemplateMaker(function () {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new ClassBinding($node_0);
    $binding_0.updateList(['className']);
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
/*
<root>
    <div :class=${{'className': true}} />
</root>
*/ const $template_11 = new TemplateMaker(function () {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new ClassBinding($node_0);
    $binding_0.updateObject({ 'className': true });
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
/*
<root>
    <div :class.className=${true} />
</root>
*/ const $template_12 = new TemplateMaker(function () {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new ClassBinding($node_0);
    $binding_0.updateObject({ className: true });
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
export class TestClassBinding extends Component {
    className = 'className';
    booleanValue = true;
    testInterpolatedString() {
        trackGet(this, "className");
        return new CompiledTemplateResult($template_0, [
            this.className
        ], this);
    }
    testString() {
        trackGet(this, "className");
        return new CompiledTemplateResult($template_1, [
            this.className
        ], this);
    }
    testQuoted() {
        trackGet(this, "booleanValue");
        return new CompiledTemplateResult($template_2, [
            this.booleanValue
        ], this);
    }
    testList() {
        trackGet(this, "className");
        return new CompiledTemplateResult($template_3, [
            [this.className]
        ], this);
    }
    testObject() {
        trackGet(this, "booleanValue");
        return new CompiledTemplateResult($template_4, [
            { 'className': this.booleanValue }
        ], this);
    }
    testModifier() {
        trackGet(this, "booleanValue");
        return new CompiledTemplateResult($template_5, [
            this.booleanValue
        ], this);
    }
    testConflictWithClassAttr() {
        trackGet(this, "className", "booleanValue");
        return new CompiledTemplateResult($template_6, [
            this.className,
            this.booleanValue
        ], this);
    }
    testConflictWithFixedClassAttr() {
        trackGet(this, "booleanValue");
        return new CompiledTemplateResult($template_7, [
            this.booleanValue
        ], this);
    }
}
export class TestStaticClassBinding extends Component {
    testInterpolatedString() {
        return new CompiledTemplateResult($template_8, [], this);
    }
    testString() {
        return new CompiledTemplateResult($template_9, [], this);
    }
    testList() {
        return new CompiledTemplateResult($template_10, [], this);
    }
    testObject() {
        return new CompiledTemplateResult($template_11, [], this);
    }
    testModifier() {
        return new CompiledTemplateResult($template_12, [], this);
    }
}
