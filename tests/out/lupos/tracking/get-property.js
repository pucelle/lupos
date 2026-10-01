import { Component } from 'lupos.html';
import { trackGet } from "lupos";
export class TestNormalProp extends Component {
    prop1 = 1;
    prop2 = 1;
    getProp() {
        trackGet(this, "prop1");
        return this.prop1;
    }
    destructedGetProp() {
        let { prop1, prop2 } = this;
        trackGet(this, "prop1", "prop2");
        return prop1 + prop2;
    }
}
export class TestElementProp extends Component {
    prop = 1;
    getProp() {
        let prop = 'prop';
        trackGet(this, "prop", prop);
        return this['prop']
            + this[prop];
    }
}
export class TestObjectProp extends Component {
    prop = { value: 1 };
    getProp() {
        trackGet(this, "prop");
        trackGet(this.prop, "value");
        return this.prop.value;
    }
    destructedGetProp() {
        let { prop: { value } } = this;
        trackGet(this, "prop");
        trackGet(this.prop, "value");
        return value;
    }
}
export class TestNullableProp extends Component {
    prop = { value: 1 };
    getProp() {
        trackGet(this, "prop");
        this.prop && trackGet(this.prop, "value");
        return this.prop?.value;
    }
}
export class TestRepetitiveProp extends Component {
    prop = { value: 1 };
    getProp() {
        trackGet(this, "prop");
        trackGet(this.prop, "value");
        return this.prop.value
            + this.prop.value
            + this.prop["value"]
            + this.prop['value'];
    }
}
export class TestGroupedProp extends Component {
    prop1 = { value1: 1, value2: 2 };
    prop2 = { value: 1 };
    getProp() {
        trackGet(this, "prop1", "prop2");
        trackGet(this.prop1, "value1", "value2");
        trackGet(this.prop2, "value");
        return this.prop1.value1
            + this.prop1.value2
            + this.prop2.value;
    }
}
export class TestQuestionDotPropMerge extends Component {
    prop = undefined;
    propDeeper = undefined;
    propDeeperList = undefined;
    /** Both receiver levels may be absent. */
    propOptionalDeeper = undefined;
    getProp() {
        trackGet(this, "prop");
        this.prop && trackGet(this.prop, "value");
        return '' + this.prop?.value
            + this.prop?.['value'];
    }
    getPropDeeper() {
        trackGet(this, "propDeeper");
        this.propDeeper && trackGet(this.propDeeper, "value");
        this.propDeeper && trackGet(this.propDeeper.value, "value");
        return this.propDeeper?.value.value ?? 0;
    }
    getPropDeeperList() {
        trackGet(this, "propDeeperList");
        this.propDeeperList && trackGet(this.propDeeperList, "value");
        this.propDeeperList && trackGet(this.propDeeperList.value, "list");
        this.propDeeperList && trackGet(this.propDeeperList.value.list, "");
        return this.propDeeperList?.value.list.length ?? 0;
    }
    /** Keep nested guards, but remove satisfied optional checks from tracking arguments. */
    getPropOptionalDeeper() {
        trackGet(this, "propOptionalDeeper");
        this.propOptionalDeeper && trackGet(this.propOptionalDeeper, "value");
        this.propOptionalDeeper?.value && trackGet(this.propOptionalDeeper.value, "value");
        return this.propOptionalDeeper?.value?.value ?? 0;
    }
}
export class TestNonObservedClass {
    prop = { value: 1 };
    getProp() {
        trackGet(this.prop, "value");
        return this.prop.value;
    }
}
export class TestAssignmentSpread {
    prop = { value: 1 };
    getProp() {
        trackGet(this.prop, "");
        return { ...this.prop };
    }
}
export class TestObjectAPIs extends Component {
    prop = { value: 1 };
    getKeys() {
        trackGet(this, "prop");
        trackGet(this.prop, "");
        return Object.keys(this.prop);
    }
    /** Track the literal key checked by a native instance method. */
    hasOwnValue() {
        trackGet(this, "prop");
        trackGet(this.prop, "value");
        return this.prop.hasOwnProperty('value');
    }
    /** Track the literal key checked by the static Object API. */
    hasOwnValueStatic() {
        trackGet(this, "prop");
        trackGet(this.prop, "value");
        return Object.hasOwn(this.prop, 'value');
    }
    /** Keep literal-key tracking inside an optional call. */
    hasOwnOptionalValue(prop) {
        return prop?.hasOwnProperty((trackGet(prop, "value"), "value"));
    }
    /** Track the checked property using the current dynamic key. */
    hasOwnDynamicKey(key) {
        trackGet(this, "prop");
        trackGet(this.prop, key);
        return this.prop.hasOwnProperty(key);
    }
    /** Evaluate a computed instance-method key only once. */
    hasOwnDynamicKeyCall(key) {
        let $ref_0;
        $ref_0 = key();
        trackGet(this, "prop");
        trackGet(this.prop, $ref_0);
        return this.prop.hasOwnProperty($ref_0);
    }
    /** Evaluate a computed static-method key only once. */
    hasOwnDynamicKeyStaticCall(key) {
        let $ref_0;
        $ref_0 = key();
        trackGet(this, "prop");
        trackGet(this.prop, $ref_0);
        return Object.hasOwn(this.prop, $ref_0);
    }
    /** Skip the computed key when the optional receiver is absent. */
    hasOwnOptionalDynamicKeyCall(prop, key) {
        let $ref_0;
        return prop?.hasOwnProperty(($ref_0 = key(), trackGet(prop, $ref_0), $ref_0));
    }
    /** Track the key used by the check, not its subsequently assigned value. */
    hasOwnReassignedKey() {
        let key = 'value';
        let $ref_0 = key, value = this.prop.hasOwnProperty($ref_0);
        key = 'other';
        trackGet(this, "prop");
        trackGet(this.prop, $ref_0);
        return value;
    }
    /** Keep each loop-key dependency inside its declaration scope. */
    hasOwnLoopKeys(keys) {
        let values = [];
        for (let key of keys) {
            values.push(this.prop.hasOwnProperty(key));
            trackGet(this.prop, key);
        }
        trackGet(this, "prop");
        return values;
    }
    /** Evaluate a computed observed receiver only once. */
    hasOwnReceiverCall(get) {
        let $ref_0;
        $ref_0 = get();
        trackGet($ref_0, "value");
        return $ref_0.hasOwnProperty('value');
    }
    /** Avoid tracking user-defined methods which happen to use the native name. */
    hasOwnCustomMethod(object) {
        return object.hasOwnProperty('value');
    }
    /** Leave native checks on unobserved objects untracked. */
    hasOwnPlainValue(prop) {
        return prop.hasOwnProperty('value');
    }
    getValues() {
        trackGet(this, "prop");
        trackGet(this.prop, "");
        return Object.values(this.prop);
    }
    getEntries() {
        trackGet(this, "prop");
        trackGet(this.prop, "");
        return Object.entries(this.prop);
    }
    assign() {
        trackGet(this, "prop");
        trackGet(this.prop, "");
        return Object.assign({}, this.prop);
    }
}
