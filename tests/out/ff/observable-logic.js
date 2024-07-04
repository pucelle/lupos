import { Component, SlotContentType } from '@pucelle/lupos.js';
import { onGetGrouped } from "@pucelle/ff";
class TestAndOrOperators extends Component {
    prop1 = '';
    prop2 = '';
    render1() {
        onGetGrouped([this, ["prop1", "prop2"]]);
        return this.prop1 || this.prop2;
    }
    render2() {
        onGetGrouped([this, ["prop1", "prop2"]]);
        return this.prop1 && this.prop2;
    }
}
class TestTernaryConditionalOperator extends Component {
    static ContentSlotType = SlotContentType.Text;
    prop1 = undefined;
    prop2 = undefined;
    render() {
        onGetGrouped([this, ["prop1", "prop2"]], [this.prop1, ["value"]], [this.prop2, ["value"]]);
        return this.prop1
            ? this.prop1.value
            : this.prop2
                ? this.prop2.value
                : '';
    }
}
