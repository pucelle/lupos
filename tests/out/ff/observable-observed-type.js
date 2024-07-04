import { Component, SlotContentType } from '@pucelle/lupos.js';
import { Observed, onGetGrouped } from '@pucelle/ff';
class TestObservedVariableType {
    render() {
        var a = { value: 1 };
        var b = { value: 1 };
        var c = b;
        onGetGrouped([a, ["value"]], [b, ["value"]], [c, ["value"]]);
        return a.value
            + b.value
            + c.value;
    }
}
class TestObservedParameters {
    prop = { value: 1 };
    renderProp1() {
        onGetGrouped([this.prop, ["value"]], [this, ["prop"]]);
        return this.prop.value;
    }
    renderProp2() {
        onGetGrouped([this.prop, ["value"]]);
        return this.prop.value;
    }
    renderProp3(item) {
        onGetGrouped([item, ["value"]]);
        return item.value;
    }
}
class TestObservedPropRenderFn extends Component {
    static ContentSlotType = SlotContentType.Text;
    prop = { value: 'Text' };
    render() {
        onGetGrouped([this, ["prop"]]);
        return this.renderProp(this.prop);
    }
    renderProp(prop) {
        onGetGrouped([prop, ["value"]]);
        return prop.value;
    }
}
class TestArrayMapFn {
    prop = [{ value: 1 }];
    render1() {
        return this.prop.map((v) => {
            onGetGrouped([v, ["value"]]);
            return v.value;
        }).join('');
    }
    render2() {
        return this.prop.map((v) => {
            onGetGrouped([v, ["value"]]);
            return v.value;
        }).join('');
    }
    render3() {
        return this.prop.map(function (v) {
            onGetGrouped([v, ["value"]]);
            return v.value;
        }).join('');
    }
}
