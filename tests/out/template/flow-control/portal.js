import { Component, CompiledTemplateResult, TemplateMaker, SlotPosition, HTMLMaker } from '@pucelle/lupos.js';
const $html_0 = /*#__PURE__*/ new HTMLMaker("<!----><template><div>Portal Content</div></template>");
/*
<root>
    <lu:portal>
        <div>Portal Content</div>
    </lu:portal>
</root>
*/ const $template_0 = /*#__PURE__*/ new TemplateMaker(function () {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    return {
        el: $node,
        position: new SlotPosition(1, $node_0)
    };
});
export class TestPortal extends Component {
    testPortal() {
        return new CompiledTemplateResult($template_0, [], this);
    }
}
