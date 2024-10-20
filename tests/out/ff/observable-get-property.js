import { trackGet } from '@pucelle/ff';
import { Component } from '@pucelle/lupos.js';
class TestNormalProp extends Component {
    prop = 1;
    getProp() {
        trackGet(this, "prop");
        return this.prop;
    }
    destructedGetProp() {
        let { prop } = this;
        trackGet(this, "prop");
        return prop;
    }
}
class TestElementProp extends Component {
    prop = 1;
    getProp() {
        let prop = 'prop';
        trackGet(this, "prop", prop);
        return this['prop']
            + this[prop];
    }
}
class TestObjectProp extends Component {
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
class TestRepetitiveProp extends Component {
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
class TestGroupedProp extends Component {
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
class TestQuestionDotPropMerge extends Component {
    prop = undefined;
    getProp() {
        trackGet(this, "prop");
        this.prop && trackGet(this.prop, "value");
        return '' + this.prop?.value
            + this.prop?.['value'];
    }
}
class TestNonObservedClass {
    prop = { value: 1 };
    getProp() {
        trackGet(this.prop, "value");
        return this.prop.value;
    }
}
