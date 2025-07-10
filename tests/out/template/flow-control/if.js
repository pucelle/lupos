import { Component, TemplateSlot, SlotPosition, CompiledTemplateResult, TemplateMaker, HTMLMaker, IfBlock, CacheableIfBlock } from '@pucelle/lupos.js';
import { trackGet } from "@pucelle/lupos";
const $html_0 = new HTMLMaker("<!----><!---->");
/*
<root>
    <lu:if ${this.prop} />
</root>
*/ const $template_0 = new TemplateMaker(function () {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.lastChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1));
    let $block_0 = new IfBlock($slot_0);
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            $block_0.update($values[0]);
        },
        parts: [
            [$slot_0, 1]
        ]
    };
});
const $html_1 = new HTMLMaker("If Content");
/*
<root>If Content</root>
*/ const $template_1 = new TemplateMaker(function () {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
/*
<root>
    <lu:if ${this.prop} cache />
</root>
*/ const $template_2 = new TemplateMaker(function () {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.lastChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1));
    let $block_0 = new CacheableIfBlock($slot_0);
    return {
        el: $node,
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
*/ const $template_3 = new TemplateMaker(function () {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
/*
<root>
    <lu:if ${this.prop} />
</root>
*/ const $template_4 = new TemplateMaker(function () {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.lastChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1));
    let $block_0 = new IfBlock($slot_0);
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            $block_0.update($values[0]);
        },
        parts: [
            [$slot_0, 1]
        ]
    };
});
const $html_5 = new HTMLMaker(" ");
/*
<root>${this.content!}</root>
*/ const $template_5 = new TemplateMaker(function () {
    let $latest_0;
    let $node = $html_5.make();
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
    <lu:if ${this.prop} />
</root>
*/ const $template_6 = new TemplateMaker(function () {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.lastChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), 0);
    let $block_0 = new IfBlock($slot_0);
    return {
        el: $node,
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
*/ const $template_7 = new TemplateMaker(function () {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_8 = new HTMLMaker("Else Content");
/*
<root>Else Content</root>
*/ const $template_8 = new TemplateMaker(function () {
    let $node = $html_8.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
/*
<root>
    <lu:if ${this.prop} />
</root>
*/ const $template_9 = new TemplateMaker(function () {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.lastChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), 0);
    let $block_0 = new IfBlock($slot_0);
    return {
        el: $node,
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
*/ const $template_10 = new TemplateMaker(function () {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_11 = new HTMLMaker("Then Content 1");
/*
<root>Then Content 1</root>
*/ const $template_11 = new TemplateMaker(function () {
    let $node = $html_11.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_12 = new HTMLMaker("Then Content 2");
/*
<root>Then Content 2</root>
*/ const $template_12 = new TemplateMaker(function () {
    let $node = $html_12.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_13 = new HTMLMaker("Then Content");
/*
<root>Then Content</root>
*/ const $template_13 = new TemplateMaker(function () {
    let $node = $html_13.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
/*
<root>
    <lu:if ${this.item && this.item.value} />
</root>
*/ const $template_14 = new TemplateMaker(function () {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.lastChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1));
    let $block_0 = new IfBlock($slot_0);
    return {
        el: $node,
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
<root>
    ${this.item!.value.map(v => html`<div>${v}</div>`)}
</root>
*/ const $template_15 = new TemplateMaker(function () {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.lastChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1), 1);
    return {
        el: $node,
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
*/ const $template_16 = new TemplateMaker(function () {
    let $latest_0;
    let $node = $html_5.make();
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
const $html_17 = new HTMLMaker("<div> </div>");
/*
<root>
    <div>${v}</div>
</root>
*/ const $template_17 = new TemplateMaker(function () {
    let $latest_0;
    let $node = $html_17.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node_0.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $node_1.data = $values[0];
                $latest_0 = $values[0];
            }
        }
    };
});
/*
<root>
    <lu:if ${this.item && this.item.value} />
</root>
*/ const $template_18 = new TemplateMaker(function () {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.lastChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1));
    let $block_0 = new IfBlock($slot_0);
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            $block_0.update($values[0]);
        },
        parts: [
            [$slot_0, 1]
        ]
    };
});
const $html_19 = new HTMLMaker("<div>Content 1</div><div>Content 2</div>");
/*
<root>
    <div>Content 1</div>
    <div>Content 2</div>
</root>
*/ const $template_19 = new TemplateMaker(function () {
    let $node = $html_19.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
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
