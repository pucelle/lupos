import { Component } from '@pucelle/lupos.js';
import { trackGet } from "@pucelle/ff";
class TestAndOrDoubleQuestionOperators extends Component {
    prop1 = { value: '1' };
    prop2 = { value: '2' };
    and() {
        trackGet(this, "prop1");
        trackGet(this.prop1, "value");
        return this.prop1.value && (trackGet(this, "prop2"), trackGet(this.prop2, "value"), this.prop2.value);
    }
    or() {
        trackGet(this, "prop1");
        trackGet(this.prop1, "value");
        return this.prop1.value || (trackGet(this, "prop2"), trackGet(this.prop2, "value"), this.prop2.value);
    }
    qq() {
        trackGet(this, "prop1");
        trackGet(this.prop1, "value");
        return this.prop1.value ?? (trackGet(this, "prop2"), trackGet(this.prop2, "value"), this.prop2.value);
    }
    orProp() {
        let $ref_0;
        $ref_0 = this.prop1 || (trackGet(this, "prop2"), this.prop2);
        trackGet($ref_0, "value");
        trackGet(this, "prop1");
        return $ref_0.value;
    }
    andProp() {
        let $ref_0;
        $ref_0 = this.prop1 && (trackGet(this, "prop2"), this.prop2);
        trackGet($ref_0, "value");
        trackGet(this, "prop1");
        return $ref_0.value;
    }
    qqProp() {
        let $ref_0;
        $ref_0 = this.prop1 ?? (trackGet(this, "prop2"), this.prop2);
        trackGet($ref_0, "value");
        trackGet(this, "prop1");
        return $ref_0.value;
    }
}
class TestTernaryConditionalOperator extends Component {
    prop1 = undefined;
    prop2 = undefined;
    byProp() {
        trackGet(this, "prop1");
        return this.prop1
            ? (trackGet(this.prop1, "value"), this.prop1.value) : (trackGet(this, "prop2"), this.prop2
            ? (trackGet(this.prop2, "value"), this.prop2.value) : '');
    }
    byParenthesizedProp() {
        let $ref_0;
        $ref_0 = this.prop1 ? this.prop1 : (trackGet(this, "prop2"), this.prop2);
        trackGet($ref_0, "value");
        trackGet(this, "prop1");
        return $ref_0.value;
    }
}
