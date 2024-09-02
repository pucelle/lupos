import { Component, html, TemplateMaker, SlotPosition, IfBlock, TemplateSlot, HTMLMaker, CacheableIfBlock } from '@pucelle/lupos.js';
import { trackGet } from "@pucelle/ff";
const $html_0 = new HTMLMaker("<!----><!---->");
/*
<tree>
    <lupos:if ${this.prop} />
</tree>
*/ const $template_0 = new TemplateMaker($context => {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.lastChild;
    $block_0 = new IfBlock(function ($values) {
        if ($values[0]) {
            return 0;
        }
        else {
            return -1;
        }
    }, [$template_1], new TemplateSlot(new SlotPosition(2, $node_1), $context));
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        update($values) {
            $block_0.update($values);
        }
    };
});
const $html_1 = new HTMLMaker("If Content");
/*
<tree>If Content</tree>
*/ const $template_1 = new TemplateMaker($context => {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0)
    };
});
/*
<tree>
    <lupos:if ${this.prop} cache />
</tree>
*/ const $template_2 = new TemplateMaker($context => {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.lastChild;
    $block_0 = new CacheableIfBlock(function ($values) {
        if ($values[0]) {
            return 0;
        }
        else {
            return -1;
        }
    }, [$template_3], new TemplateSlot(new SlotPosition(2, $node_1), $context));
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        update($values) {
            $block_0.update($values);
        }
    };
});
/*
<tree>If Content</tree>
*/ const $template_3 = new TemplateMaker($context => {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0)
    };
});
/*
<tree>
    <lupos:if ${this.prop} />
</tree>
*/ const $template_4 = new TemplateMaker($context => {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.lastChild;
    $block_0 = new IfBlock(function ($values) {
        if ($values[0]) {
            return 0;
        }
        else {
            return -1;
        }
    }, [$template_5], new TemplateSlot(new SlotPosition(2, $node_1), $context));
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        update($values) {
            $block_0.update($values);
        }
    };
});
const $html_2 = new HTMLMaker(" ");
/*
<tree> </tree>
*/ const $template_5 = new TemplateMaker($context => {
    let $latest_0;
    let $node = $html_2.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        update($values) {
            if ($latest_0 !== $values[1]) {
                $node_0.data = $latest_0 = $values[1];
            }
        }
    };
});
/*
<tree>
    <lupos:if ${this.prop} />
</tree>
*/ const $template_6 = new TemplateMaker($context => {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.lastChild;
    $block_0 = new IfBlock(function ($values) {
        if ($values[0]) {
            return 0;
        }
        else {
            return 1;
        }
    }, [$template_7, $template_8], new TemplateSlot(new SlotPosition(2, $node_1), $context));
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        update($values) {
            $block_0.update($values);
        }
    };
});
/*
<tree>If Content</tree>
*/ const $template_7 = new TemplateMaker($context => {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0)
    };
});
const $html_3 = new HTMLMaker("Else Content");
/*
<tree>Else Content</tree>
*/ const $template_8 = new TemplateMaker($context => {
    let $node = $html_3.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0)
    };
});
/*
<tree>
    <lupos:if ${this.prop} />
</tree>
*/ const $template_9 = new TemplateMaker($context => {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.lastChild;
    $block_0 = new IfBlock(function ($values) {
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
    }, [$template_10, $template_11, $template_12, $template_13], new TemplateSlot(new SlotPosition(2, $node_1), $context));
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        update($values) {
            $block_0.update($values);
        }
    };
});
/*
<tree>If Content</tree>
*/ const $template_10 = new TemplateMaker($context => {
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0)
    };
});
const $html_4 = new HTMLMaker("Then Content 1");
/*
<tree>Then Content 1</tree>
*/ const $template_11 = new TemplateMaker($context => {
    let $node = $html_4.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0)
    };
});
const $html_5 = new HTMLMaker("Then Content 2");
/*
<tree>Then Content 2</tree>
*/ const $template_12 = new TemplateMaker($context => {
    let $node = $html_5.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0)
    };
});
const $html_6 = new HTMLMaker("Then Content");
/*
<tree>Then Content</tree>
*/ const $template_13 = new TemplateMaker($context => {
    let $node = $html_6.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0)
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
