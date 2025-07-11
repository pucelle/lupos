import { Component } from '@pucelle/lupos.js';
import { trackSet } from "@pucelle/lupos";
export class TestNormalProp extends Component {
    prop = 1;
    setProp() {
        this.prop = 1;
        trackSet(this, "prop");
    }
}
export class TestElementProp extends Component {
    prop = 1;
    setProp() {
        let prop = 'prop';
        this['prop'] = 1;
        this[prop] = 1;
        trackSet(this, "prop", prop);
    }
}
export class TestObjectProp extends Component {
    prop = { value: 1 };
    setProp() {
        this.prop.value = 1;
        trackSet(this.prop, "value");
    }
}
export class TestDeconstructAssignment extends Component {
    list = [];
    prop = {};
    array() {
        [this.prop] = [{ value: 2 }];
        trackSet(this, "prop");
    }
    object() {
        ({ prop: this.prop } = { prop: { value: 2 } });
        trackSet(this, "prop");
    }
    spreadArray() {
        [...this.list] = [2];
        trackSet(this.list, "");
    }
    spreadObject() {
        ({ ...this.prop } = { value: 1 });
        trackSet(this.prop, "");
    }
}
export class TestRepetitiveProp extends Component {
    prop = { value: 1 };
    setProp() {
        this.prop.value = 1;
        this.prop.value = 2;
        this.prop["value"] = 1;
        this.prop['value'] = 2;
        trackSet(this.prop, "value");
    }
}
export class TestGroupedProp extends Component {
    prop1 = { value1: 1, value2: 2 };
    prop2 = { value: 1 };
    setProp() {
        this.prop1.value1 = 1;
        this.prop1.value2 = 2;
        this.prop2.value = 1;
        trackSet(this.prop1, "value1", "value2");
        trackSet(this.prop2, "value");
    }
}
export class TesOperators extends Component {
    prop = 1;
    plusEquals() {
        this.prop += 1;
        trackSet(this, "prop");
    }
    minusEquals() {
        this.prop -= 1;
        trackSet(this, "prop");
    }
    asteriskEquals() {
        this.prop *= 1;
        trackSet(this, "prop");
    }
    asteriskAsteriskEquals() {
        this.prop **= 1;
        trackSet(this, "prop");
    }
    slashEquals() {
        this.prop /= 1;
        trackSet(this, "prop");
    }
    percentEquals() {
        this.prop %= 1;
        trackSet(this, "prop");
    }
    lessThanLessThanEquals() {
        this.prop <<= 1;
        trackSet(this, "prop");
    }
    greaterThanGreaterThanEquals() {
        this.prop >>= 1;
        trackSet(this, "prop");
    }
    ampersandEquals() {
        this.prop &= 1;
        trackSet(this, "prop");
    }
    ampersandAmpersandEquals() {
        this.prop &&= 1;
        trackSet(this, "prop");
    }
    barEquals() {
        this.prop |= 1;
        trackSet(this, "prop");
    }
    barBarEquals() {
        this.prop ||= 1;
        trackSet(this, "prop");
    }
    questionEquals() {
        this.prop ??= 1;
        trackSet(this, "prop");
    }
    caretEquals() {
        this.prop ^= 1;
        trackSet(this, "prop");
    }
    plusPlusPrefix() {
        ++this.prop;
        trackSet(this, "prop");
    }
    minusMinusPrefix() {
        --this.prop;
        trackSet(this, "prop");
    }
    plusPlusPostfix() {
        this.prop++;
        trackSet(this, "prop");
    }
    minusMinusPostfix() {
        this.prop--;
        trackSet(this, "prop");
    }
}
export class TestDelete extends Component {
    prop = {};
    deleteProperty() {
        delete this.prop.sub;
        trackSet(this.prop, "sub");
    }
}
export class TestObjectAPIs extends Component {
    prop = { value: 1 };
    assign() {
        trackSet(this.prop, "");
        return Object.assign(this.prop, { value: 2 });
    }
}
export class TestNew extends Component {
    prop = 1;
    getInstance() {
        return this;
    }
}
let com = new TestNew();
com.prop = 1;
let com2 = com.getInstance();
com2.prop = 2;
