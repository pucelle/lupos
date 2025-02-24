import { ListMap, trackGet, trackSet } from '@pucelle/ff';
import { Component } from '@pucelle/lupos.js';
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
    getNormalItem() {
        trackGet(this, "prop");
        return this.prop;
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
export class TestMethodsObserved {
    listData = new ListMap();
    getListItem(key) {
        trackGet(this, "listData");
        trackGet(this.listData, "");
        return this.listData.get(key);
    }
    addListItem(key, value) {
        this.listData.add(key, value);
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
        listData.add(key, value);
        trackSet(listData, "");
    }
}
export class TestPropertyMethodsObserved {
    data = new AnyMethodsObserved();
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
