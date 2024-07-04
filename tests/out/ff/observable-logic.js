import { Component, SlotContentType } from '@pucelle/lupos.js';
import { trackGet } from "@pucelle/ff";
class TestAndOrOperators extends Component {
    prop1 = { value: '1' };
    prop2 = { value: '2' };
    and() {
        return (trackGet(this, "prop1"), trackGet(this.prop1, "value"), this.prop1.value) && (trackGet(this, "prop2"), trackGet(this.prop2, "value"), this.prop2.value);
    }
    or() {
        return (trackGet(this, "prop1"), trackGet(this.prop1, "value"), this.prop1.value) || (trackGet(this, "prop2"), trackGet(this.prop2, "value"), this.prop2.value);
    }
    qq() {
        return (trackGet(this, "prop1"), trackGet(this.prop1, "value"), this.prop1.value) ?? (trackGet(this, "prop2"), trackGet(this.prop2, "value"), this.prop2.value);
    }
    orProp() {
        trackGet(ref_0, "value");
        return (ref_0 = ((trackGet(this, "prop1"), this.prop1) || (trackGet(this, "prop2"), this.prop2)).value).value;
    }
    andProp() {
        trackGet(ref_0, "value");
        return (ref_0 = ((trackGet(this, "prop1"), this.prop1) && (trackGet(this, "prop2"), this.prop2)).value).value;
    }
    qqProp() {
        trackGet(ref_0, "value");
        return (ref_0 = ((trackGet(this, "prop1"), this.prop1) ?? (trackGet(this, "prop2"), this.prop2)).value).value;
    }
}
class TestDoubleQuestionOperator extends Component {
    static ContentSlotType = SlotContentType.Text;
    prop1 = undefined;
    prop2 = { value: '1' };
    render() {
        trackGet(ref_0, "value");
        return (ref_0 = ((trackGet(this, "prop1"), this.prop1) ?? (trackGet(this, "prop2"), this.prop2)).value).value;
    }
}
class TestTernaryConditionalOperator extends Component {
    prop1 = undefined;
    prop2 = undefined;
    render1() {
        return (trackGet(this, "prop1"), this.prop1) ? (trackGet(this, "prop1"), trackGet(this.prop1, "value"), this.prop1.value) : (trackGet(this, "prop2"), this.prop2) ? (trackGet(this, "prop2"), trackGet(this.prop2, "value"), this.prop2.value) : '';
    }
    render2() {
        return ((trackGet(this, "prop1"), this.prop1) ? (trackGet(this, "prop1"), this.prop1) : (trackGet(this, "prop2"), this.prop2)).value;
    }
}
