import { Component, CompiledTemplateResult, TemplateMaker, SlotPosition, HTMLMaker } from 'lupos.html';
const $html_0 = /*#__PURE__*/ new HTMLMaker("<div com></div>");
/*
<root>
    <Com .prop=${{a: '1', b: [1]}} />
</root>
*/ const $template_0 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $locator = $html_0.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $com_0 = new Com($node_0);
    $com_0.prop = { a: '1', b: [1] };
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        parts: [
            [$com_0, 1]
        ]
    };
});
class Com extends Component {
    prop;
}
/** Only ensure the compiling can pass  */
export class Ref extends Component {
    static SlotContentType = 0;
    render() {
        return new CompiledTemplateResult($template_0, [], this);
    }
}
