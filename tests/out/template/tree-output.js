import { Component, CompiledTemplateResult, TemplateMaker, SlotPosition, HTMLMaker, TemplateSlot } from 'lupos.html';
const $html_0 = /*#__PURE__*/ new HTMLMaker("<!---->");
/*
<root>
    <template class="className" />
</root>
*/ const $template_0 = /*#__PURE__*/ new TemplateMaker(function ($context, $hydrates) {
    let $locator = $html_0.make($hydrates);
    let $node_0 = $context.el;
    let $node_1 = $locator.childAt(0);
    $node_0.classList.add("className");
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_1)
    };
});
const $html_1 = /*#__PURE__*/ new HTMLMaker("<svg><path></path></svg>", true);
/*
<root>
    <svg>
        <path />
    </svg>
</root>
*/ const $template_1 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_1.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_2 = /*#__PURE__*/ new HTMLMaker("<svg><slot name=\"slotName\"></slot></svg>", true);
/*
<root>
    <svg>
        <slot name="slotName" />
    </svg>
</root>
*/ const $template_2 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_2.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $slot_0 = new TemplateSlot(new SlotPosition(0, $node_0));
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        update($values) {
            $slot_0.update($values[0]);
        },
        parts: [
            [$slot_0, 1]
        ]
    };
});
/*
<root>
    <svg>
        <path />
    </svg>
</root>
*/ const $template_3 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_1.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_4 = /*#__PURE__*/ new HTMLMaker("<div com></div>");
export class TestTemplateOutput extends Component {
    prop = 1;
    readonlyProp = 1;
    testTemplate() {
        return new CompiledTemplateResult($template_0, [], this);
    }
    testSVG() {
        return new CompiledTemplateResult($template_1, [], this);
    }
    testSVGContentSeparating() {
        return new CompiledTemplateResult($template_2, [
            this.$getSlotElement("slotName") ?? new CompiledTemplateResult($template_3, [], this)
        ], this);
    }
    testLocalReference() {
        /*
        <root>
            <Child />
        </root>
        */ const $template_4 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
            let $locator = $html_4.make($hydrates);
            let $node_0 = $locator.childAt(0);
            let $com_0 = new Child($node_0);
            return {
                el: $locator.el,
                position: new SlotPosition(1, $node_0),
                parts: [
                    [$com_0, 1]
                ]
            };
        });
        class Child extends Component {
        }
        return new CompiledTemplateResult($template_4, [], this);
    }
}
