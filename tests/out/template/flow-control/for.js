import { Component, TemplateSlot, SlotPosition, CompiledTemplateResult, TemplateMaker, HTMLMaker, ForBlock } from '@pucelle/lupos.js';
import { trackGet } from "@pucelle/ff";
const $html_0 = new HTMLMaker(" ");
/*
<root>${n + this.prop}</root>
*/ const $template_0 = new TemplateMaker(function () {
    let $latest_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $node_0.data = $values[0];
                $latest_0 = $values[0];
            }
        }
    };
});
const $html_1 = new HTMLMaker("<!----><!---->");
/*
<root>
    <lu:for ${[1,2,3]} />
</root>
*/ const $template_1 = new TemplateMaker(function ($context) {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.lastChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), $context, 1);
    let $block_0 = new ForBlock($slot_0);
    $block_0.updateRenderFn($context.renderItem);
    $block_0.updateData([1, 2, 3]);
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        parts: [
            [$slot_0, 1]
        ]
    };
});
/*
<root>
    <lu:for ${[1,2,3]} />
</root>
*/ const $template_2 = new TemplateMaker(function ($context) {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.lastChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), $context, 1);
    let $block_0 = new ForBlock($slot_0);
    $block_0.updateRenderFn((n) => {
        trackGet($context, "prop");
        return new CompiledTemplateResult($template_3, [
            n + $context.prop
        ]);
    });
    $block_0.updateData([1, 2, 3]);
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        parts: [
            [$slot_0, 1]
        ]
    };
});
/*
<root>${n + this.prop}</root>
*/ const $template_3 = new TemplateMaker(function () {
    let $latest_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $node_0.data = $values[0];
                $latest_0 = $values[0];
            }
        }
    };
});
/*
<root>
    <lu:for ${[1,2,3]} />
</root>
*/ const $template_4 = new TemplateMaker(function ($context) {
    let $latest_0;
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.lastChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), $context, 1);
    let $block_0 = new ForBlock($slot_0);
    $block_0.updateRenderFn((n) => new CompiledTemplateResult($template_5, [
        n + $latest_0
    ]));
    $block_0.updateData([1, 2, 3]);
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            $latest_0 = $values[0];
        },
        parts: [
            [$slot_0, 1]
        ]
    };
});
/*
<root>${n + prop}</root>
*/ const $template_5 = new TemplateMaker(function () {
    let $latest_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $node_0.data = $values[0];
                $latest_0 = $values[0];
            }
        }
    };
});
/*
<root>
    <lu:for ${this.items} />
</root>
*/ const $template_6 = new TemplateMaker(function ($context) {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.lastChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), $context, 1);
    let $block_0 = new ForBlock($slot_0);
    $block_0.updateRenderFn((item) => {
        trackGet(item, "value");
        return new CompiledTemplateResult($template_7, [
            item.value
        ]);
    });
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            $block_0.updateData($values[0]);
        },
        parts: [
            [$slot_0, 1]
        ]
    };
});
/*
<root>${item.value}</root>
*/ const $template_7 = new TemplateMaker(function () {
    let $latest_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $node_0.data = $values[0];
                $latest_0 = $values[0];
            }
        }
    };
});
/*
<root>
    <lu:for ${this.readonlyItems} />
</root>
*/ const $template_8 = new TemplateMaker(function ($context) {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.lastChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), $context, 1);
    let $block_0 = new ForBlock($slot_0);
    $block_0.updateRenderFn((item) => {
        trackGet(item, "value");
        return new CompiledTemplateResult($template_9, [
            item.value
        ]);
    });
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update() {
            $block_0.updateData($context.readonlyItems);
        },
        parts: [
            [$slot_0, 1]
        ]
    };
});
/*
<root>${item.value}</root>
*/ const $template_9 = new TemplateMaker(function () {
    let $latest_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $node_0.data = $values[0];
                $latest_0 = $values[0];
            }
        }
    };
});
/*
<root>
    <lu:for ${this.deepReadonlyItems} />
</root>
*/ const $template_10 = new TemplateMaker(function ($context) {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.lastChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), $context, 1);
    let $block_0 = new ForBlock($slot_0);
    $block_0.updateRenderFn((item) => {
        trackGet(item, "value");
        return new CompiledTemplateResult($template_11, [
            item.value
        ]);
    });
    $block_0.updateData($context.deepReadonlyItems);
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        parts: [
            [$slot_0, 1]
        ]
    };
});
/*
<root>${item.value}</root>
*/ const $template_11 = new TemplateMaker(function () {
    let $latest_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $node_0.data = $values[0];
                $latest_0 = $values[0];
            }
        }
    };
});
export class TestFor extends Component {
    prop = 1;
    items = [{ value: 1 }];
    readonlyItems = [{ value: 1 }];
    deepReadonlyItems = [{ value: 1 }];
    renderItem(n) {
        trackGet(this, "prop");
        return new CompiledTemplateResult($template_0, [
            n + this.prop
        ]);
    }
    testForMapFn() {
        return new CompiledTemplateResult($template_1, []);
    }
    testForLocalMapFn() {
        return new CompiledTemplateResult($template_2, []);
    }
    testForLocalVariableTransferring() {
        let prop = this.prop;
        trackGet(this, "prop");
        return new CompiledTemplateResult($template_4, [
            prop
        ]);
    }
    testForTracking() {
        trackGet(this, "items");
        trackGet(this.items, "");
        return new CompiledTemplateResult($template_6, [
            this.items
        ]);
    }
    testReadonlyTracking() {
        trackGet(this.readonlyItems, "");
        return new CompiledTemplateResult($template_8, []);
    }
    testDeepReadonlyTracking() {
        trackGet(this.deepReadonlyItems, "");
        return new CompiledTemplateResult($template_10, []);
    }
}
