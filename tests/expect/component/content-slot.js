import { Component, TemplateResult, SlotContentType } from '@pucelle/lupos.js';
import * as L from '@pucelle/lupos.js';
class C1 extends L.Component {
    static ContentSlotType = SlotContentType.TemplateResult;
    render() {
        return null;
    }
}
class C2 extends Component {
    static ContentSlotType = SlotContentType.TemplateResultArray;
    render() {
        return null;
    }
}
class C3 extends Component {
    static ContentSlotType = SlotContentType.Text;
    render() {
        return '';
    }
}
class C4 extends Component {
    render() {
        return null;
    }
}
