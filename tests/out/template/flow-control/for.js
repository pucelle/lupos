import { Component, TemplateSlot, SlotPosition, CompiledTemplateResult, TemplateMaker, HTMLMaker, ForBlock } from '@pucelle/lupos.js';
import { trackGet } from "@pucelle/lupos";
const $html_0 = /*#__PURE__*/ new HTMLMaker(" ");
/*
<root>${n + this.prop}</root>
*/ const $template_0 = /*#__PURE__*/ new TemplateMaker(function () {
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
const $html_1 = /*#__PURE__*/ new HTMLMaker("<!----><!---->");
/*
<root>
    <lu:for ${[1,2,3]} />
</root>
*/ const $template_1 = /*#__PURE__*/ new TemplateMaker(function ($context) {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.lastChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), 1);
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
*/ const $template_2 = /*#__PURE__*/ new TemplateMaker(function ($context) {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.lastChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), 1);
    let $block_0 = new ForBlock($slot_0);
    $block_0.updateRenderFn((n) => new CompiledTemplateResult($template_3, [
        n + $context.prop
    ], $context));
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
*/ const $template_3 = /*#__PURE__*/ new TemplateMaker(function () {
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
*/ const $template_4 = /*#__PURE__*/ new TemplateMaker(function ($context) {
    let $latest_0;
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.lastChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), 1);
    let $block_0 = new ForBlock($slot_0);
    $block_0.updateRenderFn((n) => new CompiledTemplateResult($template_5, [
        n + $latest_0
    ], $context));
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
*/ const $template_5 = /*#__PURE__*/ new TemplateMaker(function () {
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
*/ const $template_6 = /*#__PURE__*/ new TemplateMaker(function ($context) {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.lastChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), 1);
    let $block_0 = new ForBlock($slot_0);
    $block_0.updateRenderFn((item) => {
        trackGet(item, "value");
        return new CompiledTemplateResult($template_7, [
            item.value
        ], $context);
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
*/ const $template_7 = /*#__PURE__*/ new TemplateMaker(function () {
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
    <lu:for ${this.getItems()} />
</root>
*/ const $template_8 = /*#__PURE__*/ new TemplateMaker(function ($context) {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.lastChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), 1);
    let $block_0 = new ForBlock($slot_0);
    $block_0.updateRenderFn((item) => {
        trackGet(item, "value");
        return new CompiledTemplateResult($template_9, [
            item.value
        ], $context);
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
*/ const $template_9 = /*#__PURE__*/ new TemplateMaker(function () {
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
    <lu:for ${items} />
</root>
*/ const $template_10 = /*#__PURE__*/ new TemplateMaker(function ($context) {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.lastChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), 1);
    let $block_0 = new ForBlock($slot_0);
    $block_0.updateRenderFn((item) => {
        trackGet(item, "value");
        return new CompiledTemplateResult($template_11, [
            item.value
        ], $context);
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
*/ const $template_11 = /*#__PURE__*/ new TemplateMaker(function () {
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
*/ const $template_12 = /*#__PURE__*/ new TemplateMaker(function ($context) {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.lastChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), 1);
    let $block_0 = new ForBlock($slot_0);
    $block_0.updateRenderFn((item) => {
        trackGet(item, "value");
        return new CompiledTemplateResult($template_13, [
            item.value
        ], $context);
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
*/ const $template_13 = /*#__PURE__*/ new TemplateMaker(function () {
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
    <lu:for ${items} />
</root>
*/ const $template_14 = /*#__PURE__*/ new TemplateMaker(function ($context) {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.lastChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), 1);
    let $block_0 = new ForBlock($slot_0);
    $block_0.updateRenderFn((item) => {
        trackGet(item, "value");
        return new CompiledTemplateResult($template_15, [
            item.value
        ], $context);
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
*/ const $template_15 = /*#__PURE__*/ new TemplateMaker(function () {
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
*/ const $template_16 = /*#__PURE__*/ new TemplateMaker(function ($context) {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.lastChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), 1);
    let $block_0 = new ForBlock($slot_0);
    $block_0.updateRenderFn((item) => new CompiledTemplateResult($template_17, [
        item.value
    ], $context));
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
*/ const $template_17 = /*#__PURE__*/ new TemplateMaker(function () {
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
    <lu:for ${items} />
</root>
*/ const $template_18 = /*#__PURE__*/ new TemplateMaker(function ($context) {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.lastChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), 1);
    let $block_0 = new ForBlock($slot_0);
    $block_0.updateRenderFn((item) => new CompiledTemplateResult($template_19, [
        item.value
    ], $context));
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
*/ const $template_19 = /*#__PURE__*/ new TemplateMaker(function () {
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
    getItems() {
        trackGet(this, "items");
        return this.items;
    }
    renderItem(n) {
        trackGet(this, "prop");
        return new CompiledTemplateResult($template_0, [
            n + this.prop
        ], this);
    }
    testForMapFn() {
        return new CompiledTemplateResult($template_1, [], this);
    }
    testForLocalMapFn() {
        trackGet(this, "prop");
        return new CompiledTemplateResult($template_2, [], this);
    }
    testForLocalVariableTransferring() {
        let prop = this.prop;
        trackGet(this, "prop");
        return new CompiledTemplateResult($template_4, [
            prop
        ], this);
    }
    testForTracking() {
        trackGet(this, "items");
        trackGet(this.items, "");
        return new CompiledTemplateResult($template_6, [
            this.items
        ], this);
    }
    testForMethodGetTracking() {
        let $ref_0;
        $ref_0 = this.getItems();
        trackGet($ref_0, "");
        return new CompiledTemplateResult($template_8, [
            $ref_0
        ], this);
    }
    testForVariableTracking() {
        let items = this.items;
        trackGet(this, "items");
        trackGet(items, "");
        return new CompiledTemplateResult($template_10, [
            items
        ], this);
    }
    testReadonlyTracking() {
        trackGet(this.readonlyItems, "");
        return new CompiledTemplateResult($template_12, [], this);
    }
    testReadonlyVariableTracking() {
        let items = this.readonlyItems;
        trackGet(items, "");
        return new CompiledTemplateResult($template_14, [
            items
        ], this);
    }
    testDeepReadonlyTracking() {
        return new CompiledTemplateResult($template_16, [], this);
    }
    testDeepReadonlyVariableTracking() {
        let items = this.deepReadonlyItems;
        return new CompiledTemplateResult($template_18, [
            items
        ], this);
    }
}
