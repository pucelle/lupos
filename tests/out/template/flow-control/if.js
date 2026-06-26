import { Component, TemplateSlot, SlotPosition, CompiledTemplateResult, TemplateMaker, HTMLMaker, IfBlock, CacheableIfBlock } from 'lupos.html';
import { trackGet } from "lupos";
const $html_0 = /*#__PURE__*/ new HTMLMaker("<!----><!--8f8d2de4-->");
/*
<root>
    <lu:if ${this.prop} />
</root>
*/ const $template_0 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_0.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.getMarker("8f8d2de4");
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), null, $locator.getNodes("8f8d2de4"));
    let $block_0 = new IfBlock($slot_0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        update($values) {
            $block_0.update($values[0]);
        },
        parts: [
            [$slot_0, 1]
        ]
    };
});
const $html_1 = /*#__PURE__*/ new HTMLMaker("If Content");
/*
<root>If Content</root>
*/ const $template_1 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_1.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_2 = /*#__PURE__*/ new HTMLMaker("<!----><!--85af38f6-->");
/*
<root>
    <lu:if ${this.prop} cache />
</root>
*/ const $template_2 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_2.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.getMarker("85af38f6");
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), null, $locator.getNodes("85af38f6"));
    let $block_0 = new CacheableIfBlock($slot_0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        update($values) {
            $block_0.update($values[0]);
        },
        parts: [
            [$slot_0, 1]
        ]
    };
});
/*
<root>If Content</root>
*/ const $template_3 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_1.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_4 = /*#__PURE__*/ new HTMLMaker("<!----><!--95ba6223-->");
/*
<root>
    <lu:if ${this.prop} />
</root>
*/ const $template_4 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_4.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.getMarker("95ba6223");
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), null, $locator.getNodes("95ba6223"));
    let $block_0 = new IfBlock($slot_0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        update($values) {
            $block_0.update($values[0]);
        },
        parts: [
            [$slot_0, 1]
        ]
    };
});
const $html_5 = /*#__PURE__*/ new HTMLMaker(" ");
/*
<root>${this.content!}</root>
*/ const $template_5 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $latest_0;
    let $locator = $html_5.make($hydrates);
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
const $html_6 = /*#__PURE__*/ new HTMLMaker("<!----><!--fcdc7298-->");
/*
<root>
    <lu:if ${this.prop} />
</root>
*/ const $template_6 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_6.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.getMarker("fcdc7298");
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), 0, $locator.getNodes("fcdc7298"));
    let $block_0 = new IfBlock($slot_0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        update($values) {
            $block_0.update($values[0]);
        },
        parts: [
            [$slot_0, 1]
        ]
    };
});
/*
<root>If Content</root>
*/ const $template_7 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_1.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_8 = /*#__PURE__*/ new HTMLMaker("Else Content");
/*
<root>Else Content</root>
*/ const $template_8 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_8.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_9 = /*#__PURE__*/ new HTMLMaker("<!----><!--ca02f9ca-->");
/*
<root>
    <lu:if ${this.prop} />
</root>
*/ const $template_9 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_9.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.getMarker("ca02f9ca");
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), 0, $locator.getNodes("ca02f9ca"));
    let $block_0 = new IfBlock($slot_0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        update($values) {
            $block_0.update($values[0]);
        },
        parts: [
            [$slot_0, 1]
        ]
    };
});
/*
<root>If Content</root>
*/ const $template_10 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_1.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_11 = /*#__PURE__*/ new HTMLMaker("Then Content 1");
/*
<root>Then Content 1</root>
*/ const $template_11 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_11.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_12 = /*#__PURE__*/ new HTMLMaker("Then Content 2");
/*
<root>Then Content 2</root>
*/ const $template_12 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_12.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_13 = /*#__PURE__*/ new HTMLMaker("Then Content");
/*
<root>Then Content</root>
*/ const $template_13 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_13.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_14 = /*#__PURE__*/ new HTMLMaker("<!----><!--e58d5939-->");
/*
<root>
    <lu:if ${this.item && this.item.value} />
</root>
*/ const $template_14 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_14.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.getMarker("e58d5939");
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), null, $locator.getNodes("e58d5939"));
    let $block_0 = new IfBlock($slot_0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        update($values) {
            $block_0.update($values[0]);
        },
        parts: [
            [$slot_0, 1]
        ]
    };
});
const $html_15 = /*#__PURE__*/ new HTMLMaker("<!----><!--6df6a279-->");
/*
<root>
    ${this.item!.value.map(v => html`<div>${v}</div>`)}
</root>
*/ const $template_15 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_15.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.getMarker("6df6a279");
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), 1, $locator.getNodes("6df6a279"));
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
<root>${this.content}</root>
*/ const $template_16 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $latest_0;
    let $locator = $html_5.make($hydrates);
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
const $html_17 = /*#__PURE__*/ new HTMLMaker("<div> </div>");
/*
<root>
    <div>${v}</div>
</root>
*/ const $template_17 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $latest_0;
    let $locator = $html_17.make($hydrates);
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
const $html_18 = /*#__PURE__*/ new HTMLMaker("<!----><!--6f7d6ec9-->");
/*
<root>
    <lu:if ${this.item && this.item.value} />
</root>
*/ const $template_18 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_18.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.getMarker("6f7d6ec9");
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), null, $locator.getNodes("6f7d6ec9"));
    let $block_0 = new IfBlock($slot_0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        update($values) {
            $block_0.update($values[0]);
        },
        parts: [
            [$slot_0, 1]
        ]
    };
});
const $html_19 = /*#__PURE__*/ new HTMLMaker("<div>Content 1</div><div>Content 2</div>");
/*
<root>
    <div>Content 1</div>
    <div>Content 2</div>
</root>
*/ const $template_19 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_19.make($hydrates);
    let $node_0 = $locator.childAt(0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0)
    };
});
export class TestIf extends Component {
    prop = 1;
    content = '';
    item = { value: [1] };
    testIf() {
        trackGet(this, "prop");
        return new CompiledTemplateResult($template_0, [
            this.prop ? new CompiledTemplateResult($template_1, [], this) : null
        ], this);
    }
    testIfCacheable() {
        trackGet(this, "prop");
        return new CompiledTemplateResult($template_2, [
            this.prop ? new CompiledTemplateResult($template_3, [], this) : null
        ], this);
    }
    testDynamicIfContent() {
        trackGet(this, "prop");
        return new CompiledTemplateResult($template_4, [
            this.prop ? (trackGet(this, "content"), new CompiledTemplateResult($template_5, [
                this.content
            ], this)) : null
        ], this);
    }
    testIfElse() {
        trackGet(this, "prop");
        return new CompiledTemplateResult($template_6, [
            this.prop ? new CompiledTemplateResult($template_7, [], this) : new CompiledTemplateResult($template_8, [], this)
        ], this);
    }
    testIfElseIfElse() {
        trackGet(this, "prop");
        return new CompiledTemplateResult($template_9, [
            this.prop ? new CompiledTemplateResult($template_10, [], this) : this.prop ? new CompiledTemplateResult($template_11, [], this) : this.prop ? new CompiledTemplateResult($template_12, [], this) : new CompiledTemplateResult($template_13, [], this)
        ], this);
    }
    testIfContentTracking() {
        trackGet(this, "item");
        return new CompiledTemplateResult($template_14, [
            this.item && (trackGet(this.item, "value"), this.item.value) ? (trackGet(this.item.value, ""), new CompiledTemplateResult($template_15, [
                this.item.value.map(v => new CompiledTemplateResult($template_17, [
                    v
                ], this))
            ], this)) : (trackGet(this, "content"), this.content ? new CompiledTemplateResult($template_16, [
                this.content
            ], this) : null)
        ], this);
    }
    testIfWithMultipleChildren() {
        trackGet(this, "item");
        return new CompiledTemplateResult($template_18, [
            this.item && (trackGet(this.item, "value"), this.item.value) ? new CompiledTemplateResult($template_19, [], this) : null
        ], this);
    }
}
