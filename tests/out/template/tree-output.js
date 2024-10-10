import { Component, CompiledTemplateResult, TemplateMaker, SlotPosition, HTMLMaker, TemplateSlot } from '@pucelle/lupos.js';
const $html_0 = new HTMLMaker("<!---->");
/*
<root>
    <template class="className" />
</root>
*/ const $template_0 = new TemplateMaker(function ($context) {
    let $node = $html_0.make();
    let $node_0 = $context.el;
    let $node_1 = $node.content.firstChild;
    $node_0.classList.add("className");
    return {
        el: $node,
        position: new SlotPosition(1, $node_1)
    };
});
const $html_1 = new HTMLMaker("<svg><path></path></svg>", true);
/*
<root>
    <svg>
        <path />
    </svg>
</root>
*/ const $template_1 = new TemplateMaker(function () {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_2 = new HTMLMaker("<svg><slot name=\"slotName\"></slot></svg>", true);
/*
<root>
    <svg>
        <slot name="slotName" />
    </svg>
</root>
*/ const $template_2 = new TemplateMaker(function ($context) {
    let $node = $html_2.make();
    let $node_0 = $node.content.firstChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(0, $node_0), $context);
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            $slot_0.update($values[0]);
        },
        parts: [[$slot_0, 1]]
    };
});
/*
<root>
    <svg>
        <path />
    </svg>
</root>
*/ const $template_3 = new TemplateMaker(function () {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_4 = new HTMLMaker("<div></div>");
class TestTemplateOutput extends Component {
    prop = 1;
    readonlyProp = 1;
    testTemplate() {
        return new CompiledTemplateResult($template_0, []);
    }
    testSVG() {
        return new CompiledTemplateResult($template_1, []);
    }
    testSVGContentSeparating() {
        return new CompiledTemplateResult($template_2, [
            this.__getSlotElement("slotName") ?? new CompiledTemplateResult($template_3, [])
        ]);
    }
    testLocalReference() {
        /*
        <root>
            <Child />
        </root>
        */ const $template_4 = new TemplateMaker(function () {
            let $node = $html_4.make();
            let $node_0 = $node.content.firstChild;
            let $com_0 = new Child({}, $node_0);
            return {
                el: $node,
                position: new SlotPosition(1, $node_0),
                parts: [[$com_0, 1]]
            };
        });
        class Child extends Component {
        }
        return new CompiledTemplateResult($template_4, []);
    }
}
