import { DeepReadonly, trackGet } from '@pucelle/ff';
import { Component, SlotContentType } from '@pucelle/lupos.js';
class TestReadonlyModifier extends Component {
    static ContentSlotType = SlotContentType.Text;
    prop1 = { value: 'Text' };
    prop2 = { value: 'Text' };
    render() {
        trackGet(this, "prop2");
        return this.prop1.value
            + this.prop2.value;
    }
}
class TestReadonlyProp extends Component {
    static ContentSlotType = SlotContentType.Text;
    prop = { value: 'Text' };
    render() {
        trackGet(this, "prop");
        return this.prop.value;
    }
}
class TestReadonlyArrayProp extends Component {
    static ContentSlotType = SlotContentType.Text;
    prop = [{ value: 'Text1' }];
    render() {
        trackGet(this, "prop");
        return this.prop.map(item => { trackGet(item, "value"); return item.value; }).join(' ');
    }
}
class TestDeepReadonlyProp extends Component {
    static ContentSlotType = SlotContentType.Text;
    prop = { value: { value: 'Text' } };
    render() {
        trackGet(this, "prop");
        return this.prop.value.value;
    }
}
class TestDeepReadonlyArrayProp extends Component {
    static ContentSlotType = SlotContentType.Text;
    prop = [{ value: 'Text1' }];
    render() {
        trackGet(this, "prop");
        return this.prop.map(item => item.value).join(' ');
    }
}
