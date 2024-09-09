import { Component, html, CompiledTemplateResult, TemplateMaker, SlotPosition, IfBlock, TemplateSlot, HTMLMaker, CacheableIfBlock } from '@pucelle/lupos.js';
import { trackGet } from "@pucelle/ff";
const $html_0 = new HTMLMaker("<!----><!---->");
/*
<root>
    <lupos:if ${this.prop} />
</root>
*/ const $template_0 = new TemplateMaker(function ($context) {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.lastChild;
    let $block_0 = new IfBlock(function ($values) {
        if ($values[0]) {
            return 0;
        }
        else {
            return -1;
        }
    }, [$template_1], new TemplateSlot(new SlotPosition(1, $node_1), $context));
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            $block_0.update($values);
        }
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
    <lupos:if ${this.prop} cache />
</root>
*/ const $template_2 = new TemplateMaker(function ($context) {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.lastChild;
    let $block_0 = new CacheableIfBlock(function ($values) {
        if ($values[0]) {
            return 0;
        }
        else {
            return -1;
        }
    }, [$template_3], new TemplateSlot(new SlotPosition(1, $node_1), $context));
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            $block_0.update($values);
        }
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
    <lupos:if ${this.prop} />
</root>
*/ const $template_4 = new TemplateMaker(function ($context) {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.lastChild;
    let $block_0 = new IfBlock(function ($values) {
        if ($values[0]) {
            return 0;
        }
        else {
            return -1;
        }
    }, [$template_5], new TemplateSlot(new SlotPosition(1, $node_1), $context));
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            $block_0.update($values);
        }
    };
});
const $html_2 = new HTMLMaker(" ");
/*
<root>${this.content}</root>
*/ const $template_5 = new TemplateMaker(function () {
    let $latest_0;
    let $node = $html_2.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($latest_0 !== $values[1]) {
                $node_0.data = $latest_0 = $values[1];
            }
        }
    };
});
/*
<root>
    <lupos:if ${this.prop} />
</root>
*/ const $template_6 = new TemplateMaker(function ($context) {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.lastChild;
    let $block_0 = new IfBlock(function ($values) {
        if ($values[0]) {
            return 0;
        }
        else {
            return 1;
        }
    }, [$template_7, $template_8], new TemplateSlot(new SlotPosition(1, $node_1), $context));
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            $block_0.update($values);
        }
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
const $html_3 = new HTMLMaker("Else Content");
/*
<root>Else Content</root>
*/ const $template_8 = new TemplateMaker(function () {
    let $node = $html_3.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
/*
<root>
    <lupos:if ${this.prop} />
</root>
*/ const $template_9 = new TemplateMaker(function ($context) {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.lastChild;
    let $block_0 = new IfBlock(function ($values) {
        if ($values[0]) {
            return 0;
        }
        else if ($values[0]) {
            return 1;
        }
        else if ($values[0]) {
            return 2;
        }
        else {
            return 3;
        }
    }, [$template_10, $template_11, $template_12, $template_13], new TemplateSlot(new SlotPosition(1, $node_1), $context));
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            $block_0.update($values);
        }
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
const $html_4 = new HTMLMaker("Then Content 1");
/*
<root>Then Content 1</root>
*/ const $template_11 = new TemplateMaker(function () {
    let $node = $html_4.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_5 = new HTMLMaker("Then Content 2");
/*
<root>Then Content 2</root>
*/ const $template_12 = new TemplateMaker(function () {
    let $node = $html_5.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
const $html_6 = new HTMLMaker("Then Content");
/*
<root>Then Content</root>
*/ const $template_13 = new TemplateMaker(function () {
    let $node = $html_6.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
class TestIf extends Component {
    prop = 1;
    content = '';
    testIf() {
        trackGet(this, "prop");
        return new CompiledTemplateResult($template_0, [this.prop]);
    }
    testIfCacheable() {
        trackGet(this, "prop");
        return new CompiledTemplateResult($template_2, [this.prop]);
    }
    testDynamicIfContent() {
        trackGet(this, "prop", "content");
        return new CompiledTemplateResult($template_4, [this.prop, this.content]);
    }
    testIfElse() {
        trackGet(this, "prop");
        return new CompiledTemplateResult($template_6, [this.prop]);
    }
    testIfElseIfElse() {
        trackGet(this, "prop");
        return new CompiledTemplateResult($template_9, [this.prop]);
    }
}
