import { DeepReadonly, onGetGrouped } from '@pucelle/ff';
import { Component, SlotContentType } from '@pucelle/lupos.js';
class TestReadonlyModifier extends Component {
    static ContentSlotType = SlotContentType.Text;
    prop1 = { value: 'Text' };
    prop2 = { value: 'Text' };
    render() {
        onGetGrouped([this, ["prop2"]]);
        return this.prop1.value
            + this.prop2.value;
    }
}
class TestReadonlyProp extends Component {
    static ContentSlotType = SlotContentType.Text;
    prop = { value: 'Text' };
    render() {
        onGetGrouped([this, ["prop"]]);
        return this.prop.value;
    }
}
class TestReadonlyArrayProp extends Component {
    static ContentSlotType = SlotContentType.Text;
    prop = [{ value: 'Text1' }];
    render() {
        onGetGrouped([this, ["prop"]]);
        return this.prop.map(item => {
            onGetGrouped([item, ["value"]]);
            return item.value;
        }).join(' ');
    }
}
class TestDeepReadonlyProp extends Component {
    static ContentSlotType = SlotContentType.Text;
    prop = { value: { value: 'Text' } };
    render() {
        onGetGrouped([this, ["prop"]]);
        return this.prop.value.value;
    }
}
class TestDeepReadonlyArrayProp extends Component {
    static ContentSlotType = SlotContentType.Text;
    prop = [{ value: 'Text1' }];
    render() {
        onGetGrouped([this, ["prop"]]);
        return this.prop.map(item => item.value).join(' ');
    }
}
