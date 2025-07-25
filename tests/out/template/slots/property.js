import { Component, TemplateSlot, SlotPosition, CompiledTemplateResult, TemplateMaker, HTMLMaker, DynamicComponentBlock } from '@pucelle/lupos.js';
import { trackGet } from "@pucelle/lupos";
const $html_0 = /*#__PURE__*/ new HTMLMaker("<div></div>");
/*
<root>
    <Com1 .comProp=${1} />
</root>
*/ const $template_0 = /*#__PURE__*/ new TemplateMaker(function () {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $com_0 = new Com1($node_0);
    $com_0.comProp = 1;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        parts: [
            [$com_0, 1]
        ]
    };
});
const $html_1 = /*#__PURE__*/ new HTMLMaker("<!----><div></div><!---->");
/*
<root>
    <${this.UnionedCom} .comProp=${1} />
</root>
*/ const $template_1 = /*#__PURE__*/ new TemplateMaker(function () {
    let $com_0;
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.childNodes[1];
    let $node_2 = $node.content.lastChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_2));
    let $block_0 = new DynamicComponentBlock(function (com) {
        $node_1 = com.el;
        $com_0 = com;
        $com_0.comProp = 1;
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
    <${this.ConstructedCom} .comProp=${1} />
</root>
*/ const $template_2 = /*#__PURE__*/ new TemplateMaker(function () {
    let $com_0;
    let $node = $html_1.make();
    let $node_0 = $node.content.firstChild;
    let $node_1 = $node.content.childNodes[1];
    let $node_2 = $node.content.lastChild;
    let $slot_0 = new TemplateSlot(new SlotPosition(1, $node_2));
    let $block_0 = new DynamicComponentBlock(function (com) {
        $node_1 = com.el;
        $com_0 = com;
        $com_0.comProp = 1;
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
    <Com1 ..comProp=${1} />
</root>
*/ const $template_3 = /*#__PURE__*/ new TemplateMaker(function () {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $com_0 = new Com1($node_0);
    $com_0.comProp = 1;
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
    <Com3 .comProp=${1} />
</root>
*/ const $template_4 = /*#__PURE__*/ new TemplateMaker(function () {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $com_0 = new Com3($node_0);
    $com_0.comProp = 1;
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
    <div .elProp=${1} />
</root>
*/ const $template_5 = /*#__PURE__*/ new TemplateMaker(function () {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    $node_0.elProp = 1;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
export class TestProperty extends Component {
    UnionedCom = Com1;
    ConstructedCom = Com1;
    testComponentProperty() {
        return new CompiledTemplateResult($template_0, [], this);
    }
    testUnionedDynamicComponentProperty() {
        trackGet(this, "UnionedCom");
        return new CompiledTemplateResult($template_1, [
            this.UnionedCom
        ], this);
    }
    testConstructedDynamicComponentProperty() {
        trackGet(this, "ConstructedCom");
        return new CompiledTemplateResult($template_2, [
            this.ConstructedCom
        ], this);
    }
    testForceComponentProperty() {
        return new CompiledTemplateResult($template_3, [], this);
    }
    testInterfaceMixinComponentProperty() {
        return new CompiledTemplateResult($template_4, [], this);
    }
    testElementProperty() {
        return new CompiledTemplateResult($template_5, [], this);
    }
}
class Com1 extends Component {
    comProp = 1;
}
class Com2 extends Component {
    comProp = 1;
}
class Com3 extends Component {
}
