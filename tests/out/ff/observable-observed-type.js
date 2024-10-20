import { trackGet, trackSet } from '@pucelle/ff';
import { Component } from '@pucelle/lupos.js';
class TestObservedVariableType {
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
class TestObservedParameter {
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
class TestObservedPropertyAtUnobserved {
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
class TestObservedProperty extends Component {
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
class TestArrayMapObservedParameter {
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
class TestMethodReturnedType extends Component {
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
class TestClassTypeParameter {
    getItems(item) {
        trackGet(item, "value");
        return item.value;
    }
    setItems(item) {
        item.value = 1;
        trackSet(item, "value");
    }
}
