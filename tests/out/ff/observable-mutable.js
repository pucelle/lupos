import { Observed, trackGet, trackSet } from '@pucelle/ff';
import { Component } from '@pucelle/lupos.js';
class TestMutable extends Component {
    prop = [{ value: 1 }, { value: 2 }];
    dynamicVariableAsIndex() {
        var _ref_0;
        let index = 0;
        _ref_0 = index;
        this.prop[_ref_0].value;
        index++;
        this.prop[index].value;
        trackGet(this, "prop");
        trackGet(this.prop, "");
        trackGet(this.prop[_ref_0], "value");
        trackGet(this.prop[index], "value");
        return '';
    }
    dynamicIndexChangeOtherWhere() {
        var _ref_0;
        let index = { value: 0 };
        _ref_0 = index.value;
        this.prop[_ref_0].value;
        index.value++;
        this.prop[index.value].value;
        trackGet(this, "prop");
        trackGet(this.prop, "");
        trackGet(this.prop[_ref_0], "value");
        trackGet(this.prop[index.value], "value");
        return '';
    }
    dynamicExp() {
        var _ref_0;
        let a = this.prop[0];
        _ref_0 = a;
        _ref_0.value = 1;
        a = this.prop[1];
        a.value = 2;
        trackSet(_ref_0, "value");
        trackSet(a, "value");
    }
    dynamicExpAndIndexParam() {
        var _ref_0;
        let index = 0;
        let a = this.getItem(index++);
        _ref_0 = a;
        _ref_0.value = 1;
        a = this.getItem(index++);
        a.value = 2;
        trackSet(_ref_0, "value");
        trackSet(a, "value");
    }
    getItem(index) {
        trackGet(this, "prop");
        trackGet(this.prop, "");
        return this.prop[index];
    }
}
