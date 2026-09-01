import { Component, TemplateSlot, SlotPosition, CompiledTemplateResult, TemplateMaker, HTMLMaker, on, IfBlock } from 'lupos.html';
import { trackGet } from "lupos";
const $html_0 = /*#__PURE__*/ new HTMLMaker("<div></div>");
/*
<root>
    <div attr="${'className'}" />
</root>
*/ const $template_0 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_0.make($hydrates);
    let $node_0 = $locator.childAt(0);
    $node_0.setAttribute("attr", 'className');
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
/*
<root>
    <div attr=${this.prop} />
</root>
*/ const $template_1 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $latest_0;
    let $locator = $html_0.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $node_0.setAttribute("attr", $values[0]);
                $latest_0 = $values[0];
            }
        }
    };
});
/*
<root>
    <div attr=${this.readonlyProp} />
</root>
*/ const $template_2 = /*#__PURE__*/ new TemplateMaker(function ($context, $hydrates) {
    let $locator = $html_0.make($hydrates);
    let $node_0 = $locator.childAt(0);
    $node_0.setAttribute("attr", $context.readonlyProp);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
/*
<root>
    <div .prop=${this.getValue} />
</root>
*/ const $template_3 = /*#__PURE__*/ new TemplateMaker(function ($context, $hydrates) {
    let $locator = $html_0.make($hydrates);
    let $node_0 = $locator.childAt(0);
    $node_0.prop = $context.getValue;
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
/*
<root>
    <div attr=${this.getValue()} />
</root>
*/ const $template_4 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $latest_0;
    let $locator = $html_0.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $node_0.setAttribute("attr", $values[0]);
                $latest_0 = $values[0];
            }
        }
    };
});
/*
<root>
    <div @click=${() => this.handleEvent(this.prop)} />
</root>
*/ const $template_5 = /*#__PURE__*/ new TemplateMaker(function ($context, $hydrates) {
    let $locator = $html_0.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $binding_0 = new on($node_0, $context);
    $binding_0.update("click", () => $context.handleEvent($context.prop));
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        parts: [
            [$binding_0, 1]
        ]
    };
});
/*
<root>
    <div @click=${() => this.handleEvent(globalVariable)} />
</root>
*/ const $template_6 = /*#__PURE__*/ new TemplateMaker(function ($context, $hydrates) {
    let $locator = $html_0.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $binding_0 = new on($node_0, $context);
    $binding_0.update("click", () => $context.handleEvent(globalVariable));
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        parts: [
            [$binding_0, 1]
        ]
    };
});
/*
<root>
    <div @click=${this.handleEvent.bind(this)} />
</root>
*/ const $template_7 = /*#__PURE__*/ new TemplateMaker(function ($context, $hydrates) {
    let $locator = $html_0.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $binding_0 = new on($node_0, $context);
    $binding_0.update("click", $context.handleEvent.bind($context));
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        parts: [
            [$binding_0, 1]
        ]
    };
});
/*
<root>
    <div @click=${() => this.handleEvent(Math.PI)} />
</root>
*/ const $template_8 = /*#__PURE__*/ new TemplateMaker(function ($context, $hydrates) {
    let $locator = $html_0.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $binding_0 = new on($node_0, $context);
    $binding_0.update("click", () => $context.handleEvent(Math.PI));
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        parts: [
            [$binding_0, 1]
        ]
    };
});
/*
<root>
    <div attr="name1 ${this.prop} name2 ${this.prop}" />
</root>
*/ const $template_9 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $latest_0;
    let $locator = $html_0.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $node_0.setAttribute("attr", "name1 " + $values[0] + " name2 " + $values[0]);
                $latest_0 = $values[0];
            }
        }
    };
});
/*
<root>
    <div attr="${this.prop}" attr2=${this.prop} />
</root>
*/ const $template_10 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $latest_0, $latest_1;
    let $locator = $html_0.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $node_0.setAttribute("attr", "" + $values[0]);
                $latest_0 = $values[0];
            }
            if ($latest_1 !== $values[0]) {
                $node_0.setAttribute("attr2", $values[0]);
                $latest_1 = $values[0];
            }
        }
    };
});
const $html_11 = /*#__PURE__*/ new HTMLMaker("<!----><!--48b816f7--><!--8124be9a-->");
/*
<root>
    ${this.getValues().map(value => html`<span>${value}</span>`)}
    <lu:if ${this.prop} />
</root>
*/ const $template_11 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_11.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.getMarker("48b816f7");
    let $node_2 = $locator.getMarker("8124be9a");
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), 1, $locator.getNodes("48b816f7"));
    let $slot_1 = new TemplateSlot(new SlotPosition(1, $node_2), null, $locator.getNodes("8124be9a"));
    let $block_0 = new IfBlock($slot_1);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        update($values) {
            $slot_0.update($values[0]);
            $block_0.update($values[1]);
        },
        parts: [
            [$slot_0, 1],
            [$slot_1, 1]
        ]
    };
});
/*
<root>
    <div ?hidden=${this.getValues().length === 0} />
</root>
*/ const $template_12 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $latest_0;
    let $locator = $html_0.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $values[0] ? $node_0.setAttribute("hidden", "") : $node_0.removeAttribute("hidden");
                $latest_0 = $values[0];
            }
        }
    };
});
const $html_13 = /*#__PURE__*/ new HTMLMaker("<span> </span>");
/*
<root>
    <span>${value}</span>
</root>
*/ const $template_13 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $latest_0;
    let $locator = $html_13.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $node_0.firstChild;
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $node_1.data = $values[0];
                $latest_0 = $values[0];
            }
        }
    };
});
let globalVariable = 1;
export class TestTemplateValues extends Component {
    prop = 1;
    readonlyProp = 1;
    getValue() {
        return '';
    }
    handleEvent(_value) { }
    getValues() {
        return [1, 2];
    }
    testStatic() {
        return new CompiledTemplateResult($template_0, [], this);
    }
    testMutable() {
        trackGet(this, "prop");
        return new CompiledTemplateResult($template_1, [
            this.prop
        ], this);
    }
    testMutableOfReadonlyProp() {
        return new CompiledTemplateResult($template_2, [], this);
    }
    testMutableOfMethod() {
        return new CompiledTemplateResult($template_3, [], this);
    }
    testMutableOfCallingMethod() {
        return new CompiledTemplateResult($template_4, [
            this.getValue()
        ], this);
    }
    testMutableOfReferencingProperty() {
        return new CompiledTemplateResult($template_5, [], this);
    }
    testMutableOfReferencingTopmostVariable() {
        return new CompiledTemplateResult($template_6, [], this);
    }
    testMutableOfBoundMethod() {
        return new CompiledTemplateResult($template_7, [], this);
    }
    testMutableOfGlobalVariables() {
        return new CompiledTemplateResult($template_8, [], this);
    }
    testBundlingStringAndValues() {
        trackGet(this, "prop");
        return new CompiledTemplateResult($template_9, [
            this.prop
        ], this);
    }
    testMergingSameValues() {
        trackGet(this, "prop");
        return new CompiledTemplateResult($template_10, [
            this.prop
        ], this);
    }
    testMergingSameReferencedValues() {
        let $ref_0, $ref_1;
        $ref_1 = this.getValues();
        trackGet($ref_1, "");
        trackGet(this, "prop");
        return new CompiledTemplateResult($template_11, [
            $ref_1.map(value => new CompiledTemplateResult($template_13, [
                value
            ], this)),
            this.prop ? ($ref_0 = this.getValues(), trackGet($ref_0, ""), new CompiledTemplateResult($template_12, [
                $ref_0.length === 0
            ], this)) : null
        ], this);
    }
}
