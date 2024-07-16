import * as L from '@pucelle/lupos.js';
import { Component, TemplateResult, SlotContentType } from '@pucelle/lupos.js';
class TestTemplateResult extends L.Component {
    static ContentSlotType = SlotContentType.TemplateResult;
    render() {
        return null;
    }
}
class TestTemplateResultArray extends Component {
    static ContentSlotType = SlotContentType.TemplateResultArray;
    render() {
        return null;
    }
}
class TestText extends Component {
    static ContentSlotType = SlotContentType.Text;
    render() {
        return '';
    }
}
class TestUnionTypes extends Component {
    render() {
        return null;
    }
}
