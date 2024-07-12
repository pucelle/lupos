import { Component, SlotContentType } from '@pucelle/lupos.js';
import { Observed, trackGet } from '@pucelle/ff';
class TestHoistIndexStatement extends Component {
    prop = [{ value: 'Text' }, { value: 'Text' }];
    render1() {
        let result = '';
        let index = 0;
        while (index < 2) {
            var _ref_0;
            _ref_0 = index++;
            result += this.prop[_ref_0].value;
            trackGet(this, "prop");
            trackGet(this.prop, "");
            trackGet(this.prop[_ref_0], "value");
        }
        return result;
    }
    render2() {
        let result = '';
        let index = -1;
        while (index < 1) {
            var _ref_0;
            _ref_0 = ++index;
            result += this.prop[_ref_0].value;
            trackGet(this, "prop");
            trackGet(this.prop, "");
            trackGet(this.prop[_ref_0], "value");
        }
        return result;
    }
    render3() {
        let result = '';
        let index = 1;
        while (index >= 0) {
            var _ref_0;
            _ref_0 = index--;
            result += this.prop[_ref_0].value;
            trackGet(this, "prop");
            trackGet(this.prop, "");
            trackGet(this.prop[_ref_0], "value");
        }
        return result;
    }
    render4() {
        let result = '';
        let index = 2;
        while (index > 0) {
            var _ref_0;
            _ref_0 = --index;
            result += this.prop[_ref_0].value;
            trackGet(this, "prop");
            trackGet(this.prop, "");
            trackGet(this.prop[_ref_0], "value");
        }
        return result;
    }
    render5() {
        let result = '';
        let index = 0;
        result += this.prop[index].value;
        index++;
        result += this.prop[index].value;
        trackGet(this, "prop");
        trackGet(this.prop, "");
        trackGet(this.prop[index], "value");
        return result;
    }
    render6() {
        let result = '';
        let index = { value: 0 };
        result += this.prop[index.value].value;
        this.plusIndex(index);
        result += this.prop[index.value].value;
        trackGet(this, "prop");
        trackGet(this.prop, "");
        trackGet(this.prop[index.value], "value");
        return result;
    }
    plusIndex(index) {
        index.value++;
    }
    render7() {
        let result = '';
        let index = 0;
        result += this.getItem(index).value;
        index++;
        result += this.getItem(index).value;
        return result;
    }
    getItem(index) {
        trackGet(this, "prop");
        trackGet(this.prop, "");
        return this.prop[index];
    }
}
class TestHoistPropInArrayMapFn extends Component {
    static ContentSlotType = SlotContentType.Text;
    prop1 = [{ value: 1 }];
    prop2 = 2;
    render() {
        let c = { value: 3 };
        trackGet(this, "prop1");
        return this.prop1.map(v => { trackGet(v, "value"); trackGet(this, "prop2"); trackGet(c, "value"); return v.value + this.prop2 + c.value; }).join('');
    }
}
