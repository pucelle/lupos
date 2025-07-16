import { Component } from '@pucelle/lupos.js';
import { trackGet } from "@pucelle/lupos";
export class TestReadonlyModifier extends Component {
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
export class TestReadonlyProp extends Component {
    static SlotContentType = 2;
    prop = { value: 'Text' };
    render() {
        trackGet(this, "prop");
        return this.prop.value;
    }
}
export class TestReadonlyArrayProp extends Component {
    static SlotContentType = 2;
    prop = [{ value: 'Text1' }];
    render() {
        trackGet(this, "prop");
        return this.prop.map(item => item.value).join(' ');
    }
}
