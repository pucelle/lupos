import { Component, TemplateSlot, SlotPosition, CompiledTemplateResult, TemplateMaker, HTMLMaker, DynamicComponentBlock } from '@pucelle/lupos.js';
import { trackGet, trackSet, SimulatedEvents, DOMModifiableEvents } from "@pucelle/ff";
const $html_0 = new HTMLMaker("<div></div>");
/*
<root>
    <Com1 @connected=${this.handleEvent} />
</root>
*/ const $template_0 = new TemplateMaker(function ($context) {
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
*/ const $template_1 = new TemplateMaker(function ($context) {
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
const $html_2 = new HTMLMaker("<!----><div></div><!---->");
/*
<root>
    <${this.UnionedCom} @connected=${this.handleEvent} />
</root>
*/ const $template_2 = new TemplateMaker(function ($context) {
    let $com_0;
    let $node = $html_2.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.childNodes[1];
    let $node_2 = $node.content.lastChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_2), $context);
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
*/ const $template_3 = new TemplateMaker(function ($context) {
    let $com_0;
    let $node = $html_2.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.childNodes[1];
    let $node_2 = $node.content.lastChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_2), $context);
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
*/ const $template_4 = new TemplateMaker(function ($context) {
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
*/ const $template_5 = new TemplateMaker(function ($context) {
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
    <div @tap=${this.handleEvent} />
</root>
*/ const $template_6 = new TemplateMaker(function ($context) {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    SimulatedEvents.on($node_0, "tap", $context.handleEvent, $context);
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
/*
<root>
    <div @hold:start=${this.handleEvent} />
</root>
*/ const $template_7 = new TemplateMaker(function ($context) {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    SimulatedEvents.on($node_0, "hold:start", $context.handleEvent, $context);
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
/*
<root>
    <div @click.prevent=${this.handleEvent} />
</root>
*/ const $template_8 = new TemplateMaker(function ($context) {
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
*/ const $template_9 = new TemplateMaker(function ($context) {
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
*/ const $template_10 = new TemplateMaker(function ($context) {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    $node_0.addEventListener("click", (() => { $context.booleanValue = true; trackSet($context, "booleanValue"); }).bind($context));
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
/*
<root>
    <div @click=${() => this.handleEventWithParameter(this.booleanValue)} />
</root>
*/ const $template_11 = new TemplateMaker(function ($context) {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    $node_0.addEventListener("click", (() => $context.handleEventWithParameter($context.booleanValue)).bind($context));
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
/*
<root>
    <div @click=${(e: any) => value = e} />
</root>
*/ const $template_12 = new TemplateMaker(function ($context) {
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
export class TestEvent extends Component {
    UnionedCom = Com1;
    ConstructedCom = Com1;
    booleanValue = true;
    handleEvent() { }
    handleEventWithParameter(_value) { }
    handleAnotherEvent() { }
    testComponentEvent() {
        return new CompiledTemplateResult($template_0, []);
    }
    testMoreComponentEvent() {
        return new CompiledTemplateResult($template_1, []);
    }
    testUnionedDynamicComponentEvent() {
        trackGet(this, "UnionedCom");
        return new CompiledTemplateResult($template_2, [
            this.UnionedCom
        ]);
    }
    testConstructedDynamicComponentEvent() {
        trackGet(this, "ConstructedCom");
        return new CompiledTemplateResult($template_3, [
            this.ConstructedCom
        ]);
    }
    testForceComponentEvent() {
        return new CompiledTemplateResult($template_4, []);
    }
    testElementEvent() {
        return new CompiledTemplateResult($template_5, []);
    }
    testSimulatedTapEvent() {
        return new CompiledTemplateResult($template_6, []);
    }
    testSimulatedHoldStartEvent() {
        return new CompiledTemplateResult($template_7, []);
    }
    testEventModifier() {
        return new CompiledTemplateResult($template_8, []);
    }
    testDynamicEventHandler() {
        trackGet(this, "booleanValue");
        return new CompiledTemplateResult($template_9, [
            this.booleanValue ? this.handleEvent : this.handleAnotherEvent
        ]);
    }
    testInlineEventHandler() {
        return new CompiledTemplateResult($template_10, []);
    }
    testInlineCallMethod() {
        return new CompiledTemplateResult($template_11, []);
    }
    testLocalAssignment() {
        let value;
        value;
        return new CompiledTemplateResult($template_12, [
            (e) => value = e
        ]);
    }
}
class Com1 extends Component {
}
class Com2 extends Component {
}
