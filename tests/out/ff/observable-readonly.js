import { trackGet } from '@pucelle/ff';
import { Component } from '@pucelle/lupos.js';
class TestReadonlyModifier extends Component {
    static SlotContentType = 2;
    prop1 = { value: 'Text' };
    prop2 = { value: 'Text' };
    render() {
        trackGet(this.prop1, "value");
        trackGet(this, "prop2");
        return this.prop1.value
            + this.prop2.value;
    }
}
class TestReadonlyProp extends Component {
    static SlotContentType = 2;
    prop = { value: 'Text' };
    render() {
        trackGet(this, "prop");
        return this.prop.value;
    }
}
class TestReadonlyArrayProp extends Component {
    static SlotContentType = 2;
    prop = [{ value: 'Text1' }];
    render() {
        trackGet(this, "prop");
        trackGet(this.prop, "");
        return this.prop.map(item => {
            trackGet(item, "value");
            return item.value;
        }).join(' ');
    }
}
class TestDeepReadonlyProp extends Component {
    static SlotContentType = 2;
    prop = { value: { value: 'Text' } };
    render() {
        trackGet(this, "prop");
        trackGet(this.prop, "value");
        trackGet(this.prop.value, "value");
        return this.prop.value.value;
    }
}
class TestDeepReadonlyArrayProp extends Component {
    static SlotContentType = 2;
    prop = [{ value: 'Text1' }];
    render() {
        trackGet(this, "prop");
        trackGet(this.prop, "");
        return this.prop.map(item => item.value).join(' ');
    }
}
