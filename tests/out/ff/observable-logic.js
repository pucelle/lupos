import { trackGet } from "@pucelle/ff";
import { Component } from '@pucelle/lupos.js';
class TestAndOrDoubleQuestionOperators extends Component {
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
        var ref_0;
        ref_0 = (trackGet(this, "prop1"), this.prop1) || (trackGet(this, "prop2"), this.prop2);
        trackGet(ref_0, "value");
        return ref_0.value;
    }
    andProp() {
        var ref_0;
        ref_0 = (trackGet(this, "prop1"), this.prop1) && (trackGet(this, "prop2"), this.prop2);
        trackGet(ref_0, "value");
        return ref_0.value;
    }
    qqProp() {
        var ref_0;
        ref_0 = (trackGet(this, "prop1"), this.prop1) ?? (trackGet(this, "prop2"), this.prop2);
        trackGet(ref_0, "value");
        return ref_0.value;
    }
}
class TestTernaryConditionalOperator extends Component {
    prop1 = undefined;
    prop2 = undefined;
    byProp() {
        return (trackGet(this, "prop1"), this.prop1) ? (trackGet(this, "prop1"), trackGet(this.prop1, "value"), this.prop1.value) : (trackGet(this, "prop2"), this.prop2) ? (trackGet(this, "prop2"), trackGet(this.prop2, "value"), this.prop2.value) : '';
    }
    byParenthesizedProp() {
        return ((trackGet(this, "prop1"), this.prop1) ? (trackGet(this, "prop1"), this.prop1) : (trackGet(this, "prop2"), this.prop2)).value;
    }
}
