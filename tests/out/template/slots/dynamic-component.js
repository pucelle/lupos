import { Component, TemplateSlot, SlotPosition, SlotRange, ClassBinding, CompiledTemplateResult, TemplateMaker, DynamicComponentBlock, HTMLMaker } from 'lupos.html';
import { trackGet, trackSet } from "lupos";
const $html_0 = /*#__PURE__*/ new HTMLMaker("<!----><div com></div><!---->");
/*
<root>
    <${ChildComponent} />
</root>
*/ const $template_0 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_0.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.childAt(1);
    let $node_2 = $locator.childAt(2);
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_2));
    let $block_0 = new DynamicComponentBlock(function (com) {
        $node_1 = com.el;
    }, $node_1, $slot_0);
    $block_0.update(ChildComponent);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        parts: [
            [$slot_0, 1]
        ]
    };
});
const $html_1 = /*#__PURE__*/ new HTMLMaker("<!----><div com><!--8ae403fc-->Content</div><!---->");
/*
<root>
    <${ChildComponent}>
        Content
    </>
</root>
*/ const $template_1 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_1.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.childAt(1);
    let $node_2 = $locator.getMarker("8ae403fc");
    let $node_3 = $node_2.nextSibling;
    let $node_4 = $locator.childAt(2);
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_4));
    let $block_0 = new DynamicComponentBlock(function (com) {
        $node_1 = com.el;
    }, $node_1, $slot_0, new SlotRange($node_2, $node_3));
    $block_0.update(ChildComponent);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        parts: [
            [$slot_0, 1]
        ]
    };
});
const $html_2 = /*#__PURE__*/ new HTMLMaker("<!----><div com><!--b52e8326--><div></div></div><!---->");
/*
<root>
    <${ChildComponent} :class=${'className'}>
        <div :class=${'className'} />
    </>
</root>
*/ const $template_2 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $binding_0;
    let $locator = $html_2.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.childAt(1);
    let $node_2 = $locator.getMarker("b52e8326");
    let $node_3 = $node_2.nextSibling;
    let $node_4 = $locator.childAt(2);
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_4));
    let $block_0 = new DynamicComponentBlock(function (com) {
        $node_1 = com.el;
        $binding_0 = new ClassBinding($node_1);
        $binding_0.updateString('className');
    }, $node_1, $slot_0, new SlotRange($node_2, $node_3));
    let $binding_1 = new ClassBinding($node_3);
    $block_0.update(ChildComponent);
    $binding_1.updateString('className');
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        parts: [
            [$slot_0, 1]
        ]
    };
});
/*
<root>
    <${ChildComponent} :class=${'className'} />
</root>
*/ const $template_3 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $binding_0;
    let $locator = $html_0.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.childAt(1);
    let $node_2 = $locator.childAt(2);
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_2));
    let $block_0 = new DynamicComponentBlock(function (com) {
        $node_1 = com.el;
        $binding_0 = new ClassBinding($node_1);
        $binding_0.updateString('className');
    }, $node_1, $slot_0);
    $block_0.update(ChildComponent);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        parts: [
            [$slot_0, 1]
        ]
    };
});
/*
<root>
    <${ChildComponent} .comProp=${this.prop} />
</root>
*/ const $template_4 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $latest_0, $com_0;
    let $locator = $html_0.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $node_1 = $locator.childAt(1);
    let $node_2 = $locator.childAt(2);
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_2));
    let $block_0 = new DynamicComponentBlock(function (com) {
        $node_1 = com.el;
        $com_0 = com;
    }, $node_1, $slot_0);
    $block_0.update(ChildComponent);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $com_0.comProp = $values[0];
                $latest_0 = $values[0];
                trackSet($com_0, "comProp");
            }
        },
        parts: [
            [$slot_0, 1]
        ]
    };
});
export class TestDynamicComponent extends Component {
    prop = 1;
    testNormal() {
        return new CompiledTemplateResult($template_0, [], this);
    }
    testChildContent() {
        return new CompiledTemplateResult($template_1, [], this);
    }
    testChildContentReference() {
        return new CompiledTemplateResult($template_2, [], this);
    }
    testStaticBinding() {
        return new CompiledTemplateResult($template_3, [], this);
    }
    testDynamicProp() {
        trackGet(this, "prop");
        return new CompiledTemplateResult($template_4, [
            this.prop
        ], this);
    }
}
class ChildComponent extends Component {
    comProp;
}
