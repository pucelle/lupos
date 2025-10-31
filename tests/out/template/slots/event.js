import { Component, TemplateSlot, SlotPosition, CompiledTemplateResult, TemplateMaker, HTMLMaker, DynamicComponentBlock } from '@pucelle/lupos.js';
import { trackGet, trackSet, DOMModifiableEvents } from "@pucelle/lupos";
const $html_0 = /*#__PURE__*/ new HTMLMaker("<div></div>");
/*
<root>
    <Com1 @connected=${this.handleEvent} />
</root>
*/ const $template_0 = /*#__PURE__*/ new TemplateMaker(function ($context) {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $com_0 = new Com1($node_0);
    $com_0.on("connected", $context.handleEvent, $context);
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
    <Com1 @eventName=${this.handleEvent} />
</root>
*/ const $template_1 = /*#__PURE__*/ new TemplateMaker(function ($context) {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $com_0 = new Com1($node_0);
    $com_0.on("eventName", $context.handleEvent, $context);
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
    <Com2 @eventName=${this.handleEvent} />
</root>
*/ const $template_2 = /*#__PURE__*/ new TemplateMaker(function ($context) {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $com_0 = new Com2($node_0);
    $com_0.on("eventName", $context.handleEvent, $context);
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        parts: [
            [$com_0, 1]
        ]
    };
});
const $html_3 = /*#__PURE__*/ new HTMLMaker("<!----><div></div><!---->");
/*
<root>
    <${this.UnionedCom} @connected=${this.handleEvent} />
</root>
*/ const $template_3 = /*#__PURE__*/ new TemplateMaker(function ($context) {
    let $com_0;
    let $node = $html_3.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.childNodes[1];
    let $node_2 = $node.content.lastChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_2));
    let $block_0 = new DynamicComponentBlock(function (com) {
        $node_1 = com.el;
        $com_0 = com;
        $com_0.on("connected", $context.handleEvent, $context);
    }, $node_1, $slot_0);
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
    <${this.ConstructedCom} @connected=${this.handleEvent} />
</root>
*/ const $template_4 = /*#__PURE__*/ new TemplateMaker(function ($context) {
    let $com_0;
    let $node = $html_3.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.childNodes[1];
    let $node_2 = $node.content.lastChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_2));
    let $block_0 = new DynamicComponentBlock(function (com) {
        $node_1 = com.el;
        $com_0 = com;
        $com_0.on("connected", $context.handleEvent, $context);
    }, $node_1, $slot_0);
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
    <Com1 @@eventName=${this.handleEvent} />
</root>
*/ const $template_5 = /*#__PURE__*/ new TemplateMaker(function ($context) {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $com_0 = new Com1($node_0);
    $com_0.on("eventName", $context.handleEvent, $context);
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
    <div @click=${this.handleEvent} />
</root>
*/ const $template_6 = /*#__PURE__*/ new TemplateMaker(function ($context) {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    $node_0.addEventListener("click", $context.handleEvent.bind($context));
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
/*
<root>
    <div @click.prevent=${this.handleEvent} />
</root>
*/ const $template_7 = /*#__PURE__*/ new TemplateMaker(function ($context) {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    DOMModifiableEvents.on($node_0, "click", ["prevent"], $context.handleEvent, $context);
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
/*
<root>
    <div @click=${this.booleanValue ? this.handleEvent : this.handleAnotherEvent} />
</root>
*/ const $template_8 = /*#__PURE__*/ new TemplateMaker(function ($context) {
    let $latest_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    $node_0.addEventListener("click", (...args) => {
        $latest_0.call($context, ...args);
    });
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            $latest_0 = $values[0];
        }
    };
});
/*
<root>
    <div @click=${() => {this.booleanValue = true}} />
</root>
*/ const $template_9 = /*#__PURE__*/ new TemplateMaker(function ($context) {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    $node_0.addEventListener("click", () => { $context.booleanValue = true; trackSet($context, "booleanValue"); });
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
/*
<root>
    <div @click=${() => this.handleEventWithParameter(this.booleanValue)} />
</root>
*/ const $template_10 = /*#__PURE__*/ new TemplateMaker(function ($context) {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    $node_0.addEventListener("click", () => $context.handleEventWithParameter($context.booleanValue));
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
/*
<root>
    <div @click=${() => value} />
</root>
*/ const $template_11 = /*#__PURE__*/ new TemplateMaker(function ($context) {
    let $latest_0;
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    $node_0.addEventListener("click", (...args) => {
        $latest_0.call($context, ...args);
    });
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            $latest_0 = $values[0];
        }
    };
});
const $html_12 = /*#__PURE__*/ new HTMLMaker("<div><!----></div>");
/*
<root>
    <div @click=${(e: any) => value = e}>
        ${value}
    </div>
</root>
*/ const $template_12 = /*#__PURE__*/ new TemplateMaker(function ($context) {
    let $latest_0, $latest_1;
    let $node = $html_12.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node_0.firstChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_1));
    $node_0.addEventListener("click", (...args) => {
        $latest_0.call($context, ...args);
    });
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        update($values) {
            $latest_0 = $values[0];
            if ($latest_1 !== $values[1]) {
                $slot_0.update($values[1]);
                $latest_1 = $values[1];
            }
        },
        parts: [
            [$slot_0, 0]
        ]
    };
});
/*
<root>
    <div @click=${this.handleEvent.bind(this)} />
</root>
*/ const $template_13 = /*#__PURE__*/ new TemplateMaker(function ($context) {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    $node_0.addEventListener("click", $context.handleEvent.bind($context));
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
export class TestEvent extends Component {
    UnionedCom = Com1;
    ConstructedCom = Com1;
    booleanValue = true;
    handleEvent() { }
    handleEventWithParameter(_value) { }
    handleAnotherEvent() { }
    testComponentEvent() {
        return new CompiledTemplateResult($template_0, [], this);
    }
    testMoreComponentEvent() {
        return new CompiledTemplateResult($template_1, [], this);
    }
    testExtendedComponentEvent() {
        return new CompiledTemplateResult($template_2, [], this);
    }
    testUnionedDynamicComponentEvent() {
        trackGet(this, "UnionedCom");
        return new CompiledTemplateResult($template_3, [
            this.UnionedCom
        ], this);
    }
    testConstructedDynamicComponentEvent() {
        trackGet(this, "ConstructedCom");
        return new CompiledTemplateResult($template_4, [
            this.ConstructedCom
        ], this);
    }
    testForceComponentEvent() {
        return new CompiledTemplateResult($template_5, [], this);
    }
    testElementEvent() {
        return new CompiledTemplateResult($template_6, [], this);
    }
    testEventModifier() {
        return new CompiledTemplateResult($template_7, [], this);
    }
    testDynamicEventHandler() {
        trackGet(this, "booleanValue");
        return new CompiledTemplateResult($template_8, [
            this.booleanValue ? this.handleEvent : this.handleAnotherEvent
        ], this);
    }
    testInlineEventHandler() {
        return new CompiledTemplateResult($template_9, [], this);
    }
    testInlineCallMethod() {
        return new CompiledTemplateResult($template_10, [], this);
    }
    testLocalReference() {
        let value = 1;
        return new CompiledTemplateResult($template_11, [
            () => value
        ], this);
    }
    testLocalAssignment() {
        let value;
        return new CompiledTemplateResult($template_12, [
            (e) => value = e,
            value
        ], this);
    }
    testIgnoringBound() {
        return new CompiledTemplateResult($template_13, [], this);
    }
}
class Com1 extends Component {
}
class Com2 extends Com1 {
}
