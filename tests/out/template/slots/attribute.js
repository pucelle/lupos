import { Component, CompiledTemplateResult, TemplateMaker, SlotPosition, HTMLMaker } from 'lupos.html';
import { trackGet } from "lupos";
const $html_0 = /*#__PURE__*/ new HTMLMaker("<div></div>");
/*
<root>
    <div class="${this.className} className2" />
</root>
*/ const $template_0 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $latest_0;
    let $locator = $html_0.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $node_0.setAttribute("class", $values[0] + " className2");
                $latest_0 = $values[0];
            }
        }
    };
});
/*
<root>
    <div class=${this.className} />
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
                $node_0.setAttribute("class", $values[0]);
                $latest_0 = $values[0];
            }
        }
    };
});
/*
<root>
    <div class=${this.nullableClassName} />
</root>
*/ const $template_2 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $latest_0;
    let $locator = $html_0.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $values[0] === null ? $node_0.removeAttribute("class") : $node_0.setAttribute("class", $values[0]);
                $latest_0 = $values[0];
            }
        }
    };
});
const $html_3 = /*#__PURE__*/ new HTMLMaker("<div com></div>");
/*
<root>
    <Com class="className" />
</root>
*/ const $template_3 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_3.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $com_0 = new Com($node_0, !!$hydrates);
    $node_0.classList.add("className");
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        parts: [
            [$com_0, 1]
        ]
    };
});
/*
<root>
    <div ?hidden=${this.booleanValue} />
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
                $values[0] ? $node_0.setAttribute("hidden", "") : $node_0.removeAttribute("hidden");
                $latest_0 = $values[0];
            }
        }
    };
});
/*
<root>
    <Com autofocus />
</root>
*/ const $template_5 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_3.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $com_0 = new Com($node_0, !!$hydrates);
    $node_0.setAttribute("autofocus", "");
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        parts: [
            [$com_0, 1]
        ]
    };
});
const $html_6 = /*#__PURE__*/ new HTMLMaker("<!---->");
/*
<root>
    <template class="classNameSelf" />
</root>
*/ const $template_6 = /*#__PURE__*/ new TemplateMaker(function ($context, $hydrates) {
    let $locator = $html_6.make($hydrates);
    let $node_0 = $context.el;
    let $node_1 = $locator.childAt(0);
    $node_0.classList.add("classNameSelf");
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_1)
    };
});
export class TestAttribute extends Component {
    className = 'className';
    booleanValue = true;
    nullableClassName;
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
    testNullableAttr() {
        trackGet(this, "nullableClassName");
        return new CompiledTemplateResult($template_2, [
            this.nullableClassName
        ], this);
    }
    testComponentClass() {
        return new CompiledTemplateResult($template_3, [], this);
    }
    testQueryAttr() {
        trackGet(this, "booleanValue");
        return new CompiledTemplateResult($template_4, [
            this.booleanValue
        ], this);
    }
    testEmptyAttrValue() {
        return new CompiledTemplateResult($template_5, [], this);
    }
}
class Com extends Component {
    static SlotContentType = 0;
    render() {
        return new CompiledTemplateResult($template_6, [], this);
    }
}
