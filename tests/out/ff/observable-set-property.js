import { Observed, trackSet, trackGet } from '@pucelle/ff';
import { Component } from '@pucelle/lupos.js';
class TestNormalProp extends Component {
    prop = 1;
    setProp() {
        this.prop = 1;
        trackSet(this, "prop");
    }
}
class TestElementProp extends Component {
    prop = 1;
    setProp() {
        let prop = 'prop';
        this['prop'] = 1;
        this[prop] = 1;
        trackSet(this, 'prop', prop);
    }
}
class TestObjectProp extends Component {
    prop = { value: 1 };
    setProp() {
        this.prop.value = 1;
        trackSet(this.prop, "value");
    }
}
class TestRepetitiveProp extends Component {
    prop = { value: 1 };
    setProp() {
        this.prop.value = 1;
        this.prop.value = 2;
        this.prop["value"] = 1;
        this.prop['value'] = 2;
        trackSet(this.prop, "value");
    }
}
class TestGroupedProp extends Component {
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
class TesOperators extends Component {
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
