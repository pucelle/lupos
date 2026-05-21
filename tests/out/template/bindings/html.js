import { Component, HTMLBinding, CompiledTemplateResult, TemplateMaker, SlotPosition, HTMLMaker } from 'lupos.html';
import { trackGet } from "lupos";
const $html_0 = /*#__PURE__*/ new HTMLMaker("<div html></div>");
/*
<root>
    <div :html=${this.html} html />
</root>
*/ const $template_0 = /*#__PURE__*/ new TemplateMaker(function (_$context, $hydrates) {
    let $latest_0;
    let $locator = $html_0.make($hydrates);
    let $node_0 = $locator.childAt(0);
    let $binding_0 = new HTMLBinding($node_0);
    return {
        el: $locator.el,
        position: new SlotPosition(1, $node_0),
        update($values) {
            if ($latest_0 !== $values[0]) {
                $binding_0.update($values[0]);
                $latest_0 = $values[0];
            }
        }
    };
});
export class TestHTMLBinding extends Component {
    html = 'HTML';
    testHTML() {
        trackGet(this, "html");
        return new CompiledTemplateResult($template_0, [
            this.html
        ], this);
    }
}
