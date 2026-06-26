import { Component, TemplateSlot, SlotPosition, CompiledTemplateResult, TemplateMaker, HTMLMaker, ForBlock } from 'lupos.html';
import { trackGet } from "lupos";
const $html_0 = /*#__PURE__*/ new HTMLMaker(" ");
/*
<root>${n + this.prop}</root>
*/ const $template_0 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $latest_0;
    let $locator = $html_0.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $node_0.data = $values[0];
                $latest_0 = $values[0];
            }
        }
    };
});
const $html_1 = /*#__PURE__*/ new HTMLMaker("<!----><!--98012245-->");
/*
<root>
    <lu:for ${[1,2,3]} />
</root>
*/ const $template_1 = /*#__PURE__*/ new TemplateMaker(function ($context, $hydrates) {
    let $locator = $html_1.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.getMarker("98012245");
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), 1, $locator.getNodes("98012245"));
    let $block_0 = new ForBlock($slot_0);
    $block_0.updateRenderFn($context.renderItem);
    $block_0.updateData([1, 2, 3]);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        parts: [
            [$slot_0, 1]
        ]
    };
});
const $html_2 = /*#__PURE__*/ new HTMLMaker("<!----><!--b19a8393-->");
/*
<root>
    <lu:for ${[1,2,3]} />
</root>
*/ const $template_2 = /*#__PURE__*/ new TemplateMaker(function ($context, $hydrates) {
    let $locator = $html_2.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.getMarker("b19a8393");
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), 1, $locator.getNodes("b19a8393"));
    let $block_0 = new ForBlock($slot_0);
    $block_0.updateRenderFn((n) => new CompiledTemplateResult($template_3, [
        n + $context.prop
    ], $context));
    $block_0.updateData([1, 2, 3]);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        parts: [
            [$slot_0, 1]
        ]
    };
});
/*
<root>${n + this.prop}</root>
*/ const $template_3 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $latest_0;
    let $locator = $html_0.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $node_0.data = $values[0];
                $latest_0 = $values[0];
            }
        }
    };
});
const $html_4 = /*#__PURE__*/ new HTMLMaker("<!----><!--8f1d3490-->");
/*
<root>
    <lu:for ${[1,2,3]} />
</root>
*/ const $template_4 = /*#__PURE__*/ new TemplateMaker(function ($context, $hydrates) {
    let $latest_0;
    let $locator = $html_4.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.getMarker("8f1d3490");
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), 1, $locator.getNodes("8f1d3490"));
    let $block_0 = new ForBlock($slot_0);
    $block_0.updateRenderFn((n) => new CompiledTemplateResult($template_5, [
        n + $latest_0
    ], $context));
    $block_0.updateData([1, 2, 3]);
    return {
        el: $locator.el,
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
*/ const $template_5 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $latest_0;
    let $locator = $html_0.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $node_0.data = $values[0];
                $latest_0 = $values[0];
            }
        }
    };
});
const $html_6 = /*#__PURE__*/ new HTMLMaker("<!----><!--355e9d9c-->");
/*
<root>
    <lu:for ${this.items} />
</root>
*/ const $template_6 = /*#__PURE__*/ new TemplateMaker(function ($context, $hydrates) {
    let $locator = $html_6.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.getMarker("355e9d9c");
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), 1, $locator.getNodes("355e9d9c"));
    let $block_0 = new ForBlock($slot_0);
    $block_0.updateRenderFn((item) => {
        trackGet(item, "value");
        return new CompiledTemplateResult($template_7, [
            item.value
        ], $context);
    });
    return {
        el: $locator.el,
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
*/ const $template_7 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $latest_0;
    let $locator = $html_0.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $node_0.data = $values[0];
                $latest_0 = $values[0];
            }
        }
    };
});
const $html_8 = /*#__PURE__*/ new HTMLMaker("<!----><!--89087358-->");
/*
<root>
    <lu:for ${this.getItems()} />
</root>
*/ const $template_8 = /*#__PURE__*/ new TemplateMaker(function ($context, $hydrates) {
    let $locator = $html_8.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.getMarker("89087358");
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), 1, $locator.getNodes("89087358"));
    let $block_0 = new ForBlock($slot_0);
    $block_0.updateRenderFn((item) => {
        trackGet(item, "value");
        return new CompiledTemplateResult($template_9, [
            item.value
        ], $context);
    });
    return {
        el: $locator.el,
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
*/ const $template_9 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $latest_0;
    let $locator = $html_0.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $node_0.data = $values[0];
                $latest_0 = $values[0];
            }
        }
    };
});
const $html_10 = /*#__PURE__*/ new HTMLMaker("<!----><!--102be637-->");
/*
<root>
    <lu:for ${items} />
</root>
*/ const $template_10 = /*#__PURE__*/ new TemplateMaker(function ($context, $hydrates) {
    let $locator = $html_10.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.getMarker("102be637");
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), 1, $locator.getNodes("102be637"));
    let $block_0 = new ForBlock($slot_0);
    $block_0.updateRenderFn((item) => {
        trackGet(item, "value");
        return new CompiledTemplateResult($template_11, [
            item.value
        ], $context);
    });
    return {
        el: $locator.el,
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
*/ const $template_11 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $latest_0;
    let $locator = $html_0.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $node_0.data = $values[0];
                $latest_0 = $values[0];
            }
        }
    };
});
const $html_12 = /*#__PURE__*/ new HTMLMaker("<!----><!--de4594b6-->");
/*
<root>
    <lu:for ${this.readonlyItems} />
</root>
*/ const $template_12 = /*#__PURE__*/ new TemplateMaker(function ($context, $hydrates) {
    let $locator = $html_12.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.getMarker("de4594b6");
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), 1, $locator.getNodes("de4594b6"));
    let $block_0 = new ForBlock($slot_0);
    $block_0.updateRenderFn((item) => {
        trackGet(item, "value");
        return new CompiledTemplateResult($template_13, [
            item.value
        ], $context);
    });
    return {
        el: $locator.el,
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
*/ const $template_13 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $latest_0;
    let $locator = $html_0.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $node_0.data = $values[0];
                $latest_0 = $values[0];
            }
        }
    };
});
const $html_14 = /*#__PURE__*/ new HTMLMaker("<!----><!--a9ef2eaf-->");
/*
<root>
    <lu:for ${items} />
</root>
*/ const $template_14 = /*#__PURE__*/ new TemplateMaker(function ($context, $hydrates) {
    let $locator = $html_14.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.getMarker("a9ef2eaf");
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), 1, $locator.getNodes("a9ef2eaf"));
    let $block_0 = new ForBlock($slot_0);
    $block_0.updateRenderFn((item) => {
        trackGet(item, "value");
        return new CompiledTemplateResult($template_15, [
            item.value
        ], $context);
    });
    return {
        el: $locator.el,
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
*/ const $template_15 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $latest_0;
    let $locator = $html_0.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $node_0.data = $values[0];
                $latest_0 = $values[0];
            }
        }
    };
});
const $html_16 = /*#__PURE__*/ new HTMLMaker("<!----><!--a26b45c4-->");
/*
<root>
    <lu:for ${this.deepReadonlyItems} />
</root>
*/ const $template_16 = /*#__PURE__*/ new TemplateMaker(function ($context, $hydrates) {
    let $locator = $html_16.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.getMarker("a26b45c4");
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), 1, $locator.getNodes("a26b45c4"));
    let $block_0 = new ForBlock($slot_0);
    $block_0.updateRenderFn((item) => new CompiledTemplateResult($template_17, [
        item.value
    ], $context));
    $block_0.updateData($context.deepReadonlyItems);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        parts: [
            [$slot_0, 1]
        ]
    };
});
/*
<root>${item.value}</root>
*/ const $template_17 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $latest_0;
    let $locator = $html_0.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $node_0.data = $values[0];
                $latest_0 = $values[0];
            }
        }
    };
});
const $html_18 = /*#__PURE__*/ new HTMLMaker("<!----><!--490faa64-->");
/*
<root>
    <lu:for ${items} />
</root>
*/ const $template_18 = /*#__PURE__*/ new TemplateMaker(function ($context, $hydrates) {
    let $locator = $html_18.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.getMarker("490faa64");
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), 1, $locator.getNodes("490faa64"));
    let $block_0 = new ForBlock($slot_0);
    $block_0.updateRenderFn((item) => new CompiledTemplateResult($template_19, [
        item.value
    ], $context));
    return {
        el: $locator.el,
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
*/ const $template_19 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $latest_0;
    let $locator = $html_0.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
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
