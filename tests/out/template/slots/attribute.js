import { Component, CompiledTemplateResult, TemplateMaker, SlotPosition, HTMLMaker } from '@pucelle/lupos.js';
import { trackGet } from "@pucelle/lupos";
const $html_0 = new HTMLMaker("<div></div>");
/*
<root>
    <div class="${this.className} className2" />
</root>
*/ const $template_0 = new TemplateMaker(function () {
    let $latest_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
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
*/ const $template_1 = new TemplateMaker(function () {
    let $latest_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
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
*/ const $template_2 = new TemplateMaker(function () {
    let $latest_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $values[0] === null ? $node_0.removeAttribute("class") : $node_0.setAttribute("class", $values[0]);
                $latest_0 = $values[0];
            }
        }
    };
});
/*
<root>
    <Com class="className" />
</root>
*/ const $template_3 = new TemplateMaker(function () {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $com_0 = new Com($node_0);
    $node_0.classList.add("className");
    return {
        el: $node,
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
*/ const $template_4 = new TemplateMaker(function () {
    let $latest_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
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
*/ const $template_5 = new TemplateMaker(function () {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $com_0 = new Com($node_0);
    $node_0.setAttribute("autofocus", "");
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        parts: [
            [$com_0, 1]
        ]
    };
});
const $html_6 = new HTMLMaker("<!---->");
/*
<root>
    <template class="classNameSelf" />
</root>
*/ const $template_6 = new TemplateMaker(function ($context) {
    let $node = $html_6.make();
    let $node_0 = $context.el;
    let $node_1 = $node.content.firstChild;
    $node_0.classList.add("classNameSelf");
    return {
        el: $node,
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
