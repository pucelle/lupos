import { Component, html, RefBinding, TemplateMaker, SlotPosition, HTMLMaker } from '@pucelle/lupos.js';
import { trackGet } from "@pucelle/ff";
const $html_0 = new HTMLMaker("<ChildComponent></ChildComponent>");
const $template_0 = new TemplateMaker($context => {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    $com_0 = new ChildComponent($node_0);
    let $binding_0 = new RefBinding($node_0, $context);
    let $com_0;
    return {
        el: $node,
        position: new SlotPosition(2, $node_0),
        parts: [$com_0, $binding_0]
    };
});
class TestRefBinding extends Component {
    refEl;
    refCom;
    refElByType;
    // testRefEl() {
    // 	return html`<div :ref=${this.refEl} />`
    // }
    testRefCom() {
        trackGet(this, "refCom");
        return new CompiledTemplateResult($template_0, []);
    }
}
class ChildComponent extends Component {
}
