import { Component, ClassBinding, CompiledTemplateResult, TemplateMaker, SlotPosition, HTMLMaker } from '@pucelle/lupos.js';
import { trackGet } from "@pucelle/ff";
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
    <div :class="${'className'} className2" />
</root>
*/ const $template_6 = new TemplateMaker(function () {
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
*/ const $template_7 = new TemplateMaker(function () {
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
*/ const $template_8 = new TemplateMaker(function () {
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
*/ const $template_9 = new TemplateMaker(function () {
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
*/ const $template_10 = new TemplateMaker(function () {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new ClassBinding($node_0);
    $binding_0.updateObject({ className: true });
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
class TestClassBinding extends Component {
    className = 'className';
    booleanValue = true;
    testInterpolatedString() {
        trackGet(this, "className");
        return new CompiledTemplateResult($template_0, [
            this.className
        ]);
    }
    testString() {
        trackGet(this, "className");
        return new CompiledTemplateResult($template_1, [
            this.className
        ]);
    }
    testQuoted() {
        trackGet(this, "booleanValue");
        return new CompiledTemplateResult($template_2, [
            this.booleanValue
        ]);
    }
    testList() {
        trackGet(this, "className");
        return new CompiledTemplateResult($template_3, [
            [this.className]
        ]);
    }
    testObject() {
        trackGet(this, "booleanValue");
        return new CompiledTemplateResult($template_4, [
            { 'className': this.booleanValue }
        ]);
    }
    testModifier() {
        trackGet(this, "booleanValue");
        return new CompiledTemplateResult($template_5, [
            this.booleanValue
        ]);
    }
}
class TestStaticClassBinding extends Component {
    testInterpolatedString() {
        return new CompiledTemplateResult($template_6, []);
    }
    testString() {
        return new CompiledTemplateResult($template_7, []);
    }
    testList() {
        return new CompiledTemplateResult($template_8, []);
    }
    testObject() {
        return new CompiledTemplateResult($template_9, []);
    }
    testModifier() {
        return new CompiledTemplateResult($template_10, []);
    }
}
