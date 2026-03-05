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
    getProp() {
        trackGet(this, "prop");
        this.prop && trackGet(this.prop, "value");
        return '' + this.prop?.value
            + this.prop?.['value'];
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
