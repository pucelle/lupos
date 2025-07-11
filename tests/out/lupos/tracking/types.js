import { MethodsObserved, Observed, UnObserved } from '../../../../web/out';
import { Component } from '@pucelle/lupos.js';
import { EffectMaker, trackGet, trackSet } from "@pucelle/lupos";
export class TestObservedVariableType {
    variables() {
        var a = { value: 1 };
        var b = { value: 1 };
        var c = b;
        trackGet(a, "value");
        trackGet(b, "value");
        trackGet(c, "value");
        return a.value
            + b.value
            + c.value;
    }
    VariableObjectDeconstructedAssignment() {
        var o = { prop: { value: 1 } };
        var { prop } = o;
        trackGet(o, "prop");
        trackGet(prop, "value");
        return prop.value;
    }
    variableArrayDeconstructedAssignment() {
        var a = [{ value: 1 }];
        var [item] = a;
        trackGet(a, 0);
        trackGet(item, "value");
        return item.value;
    }
    variableGetter() {
        var a = { get b() { return 1; } };
        trackGet(a, "b");
        return a.b;
    }
    variableInstanceGetter() {
        var a = new ObservedHasGetter();
        trackGet(a, "b");
        return a.b;
    }
}
class ObservedHasGetter {
    get b() {
        return 1;
    }
}
export class TestObservedParameter {
    prop = { value: 1 };
    parameterAs(a = { value: 1 }) {
        trackGet(a, "value");
        return a.value;
    }
    parameterType(a) {
        trackGet(a, "value");
        return a.value;
    }
    parameterThis() {
        trackGet(this, "prop");
        trackGet(this.prop, "value");
        return this.prop.value;
    }
}
export class TestObservedPropertyAtUnobserved {
    observedTypeProp = { value: 1 };
    observedInitProp = { value: 1 };
    unObservedProp = { value: 1 };
    getObservedTypePropValue() {
        trackGet(this.observedTypeProp, "value");
        return this.observedTypeProp.value;
    }
    getObservedInitPropValue() {
        trackGet(this.observedInitProp, "value");
        return this.observedInitProp.value;
    }
    getAsProp() {
        trackGet(this.unObservedProp, "value");
        return this.unObservedProp.value;
    }
}
export class TestObservedProperty extends Component {
    prop = { value: 1 };
    getPropValueUseMethod() {
        trackGet(this, "prop");
        return this.getPropValue(this.prop);
    }
    getPropValue(prop) {
        trackGet(prop, "value");
        return prop.value;
    }
    expressionDistinct() {
        trackGet(this, "prop");
        trackGet(this.prop, "value");
        return this.prop.value + this.prop.value;
    }
}
export class TestArrayMapObservedParameter {
    prop = [{ value: 1 }];
    arrowFnImplicitReturn() {
        return this.prop.map((v) => {
            trackGet(v, "value");
            return v.value;
        }).join('');
    }
    arrowFnBlockBody() {
        return this.prop.map((v) => { trackGet(v, "value"); return v.value; }).join('');
    }
    normalFn() {
        return this.prop.map(function (v) { trackGet(v, "value"); return v.value; }).join('');
    }
}
export class TestMethodReturnedType extends Component {
    prop = { value: 'Text' };
    getNormalItem() {
        trackGet(this, "prop");
        return this.prop;
    }
    getValueUseMethod() {
        var item = this.getNormalItem();
        trackGet(item, "value");
        return item.value;
    }
    getValueUseMethodSingleExp() {
        let $ref_0;
        $ref_0 = this.getNormalItem();
        trackGet($ref_0, "value");
        return $ref_0.value;
    }
    getValueUseObservedMethod() {
        var item = this.getObservedItem();
        trackGet(item, "value");
        return item.value;
    }
    getValueUseObservedMethodSingleExp() {
        let $ref_0;
        $ref_0 = this.getObservedItem();
        trackGet($ref_0, "value");
        return $ref_0.value;
    }
    getObservedItem() {
        trackGet(this, "prop");
        return this.prop;
    }
    getValueUseObservedInstance() {
        let $ref_0;
        $ref_0 = this.getInstance();
        trackGet($ref_0, "prop");
        trackGet($ref_0.prop, "value");
        return $ref_0.prop.value;
    }
    getInstance() {
        return this;
    }
}
export class TestClassTypeParameter {
    getItems(item) {
        trackGet(item, "value");
        return item.value;
    }
    setItems(item) {
        item.value = 1;
        trackSet(item, "value");
    }
}
export class TestObservedInterface {
    getItems(item) {
        trackGet(item, "value");
        return item.value;
    }
    setItems(item) {
        item.value = 1;
        trackSet(item, "value");
    }
}
export class TestMethodsObserved {
    listData = new ListMap();
    getListItem(key) {
        trackGet(this, "listData");
        trackGet(this.listData, "");
        return this.listData.get(key);
    }
    addListItem(key, value) {
        this.listData.set(key, value);
        trackSet(this.listData, "");
    }
    getListItemAsVariable(key) {
        let listData = this.listData;
        trackGet(this, "listData");
        trackGet(listData, "");
        return listData.get(key);
    }
    addListItemAsVariable(key, value) {
        let listData = this.listData;
        listData.set(key, value);
        trackSet(listData, "");
    }
}
class ListMap {
    get(key) {
        return key;
    }
    set(key, value) {
        return key + value;
    }
}
export class TestPropertyMethodsObserved {
    data = new AnyMethodsObserved();
    constructor() {
        this.$setOverlapSetKeys_effector = new EffectMaker(this.setOverlapSetKeys, this);
        this.$setOverlapSetKeys_effector.connect();
    }
    getItem() {
        trackGet(this.data, "");
        return this.data.get();
    }
    addItem() {
        this.data.set(1);
        trackSet(this.data, "");
    }
    getItemAsVariable() {
        let data = this.data;
        trackGet(data, "");
        return data.get();
    }
    addItemAsVariable() {
        let data = this.data;
        data.set(1);
        trackSet(data, "");
    }
    getItemAsParameter(data) {
        trackGet(data, "");
        return data.get();
    }
    addItemAsParameter(data) {
        data.set(1);
        trackSet(data, "");
    }
    mergeGetKeys() {
        this.data.value;
        trackGet(this.data, "");
        return this.data.get();
    }
    nullableDataGet() {
        let data = new AnyMethodsObserved();
        data && trackGet(data, "");
        return data?.get();
    }
    $setOverlapSetKeys_effector = undefined;
    setOverlapSetKeys() {
        let a = this.data.get();
        this.data.set(a);
        trackSet(this.data, "");
    }
}
class AnyMethodsObserved {
    value = 1;
    get() {
        return this.value;
    }
    set(value) {
        this.value = value;
    }
}
export class TestUnObserved extends Component {
    prop = { value: 1 };
    unObservedProp = { value: 1 };
    readAsUnObserved() {
        return this.prop;
    }
    readThisAsUnObservedParameter() {
        return this.prop;
    }
    writeAsUnObserved() {
        this.prop.value = 1;
    }
    writeThisUnObservedParameter() {
        this.prop.value = 1;
    }
    readUnObservedPropValue() {
        return this.unObservedProp.value;
    }
    writeUnObservedPropValue() {
        this.unObservedProp.value = 1;
    }
    assignUnObservedPropValue() {
        Object.assign(this.unObservedProp, { value: 1 });
    }
}
export class TestUnObservedImplements extends Component {
    prop = { value: 1 };
    read() {
        return this.prop;
    }
    write() {
        this.prop.value = 1;
    }
}
