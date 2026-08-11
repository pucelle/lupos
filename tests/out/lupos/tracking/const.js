import { Component } from 'lupos.html';
export class TestAsConst extends Component {
    static SlotContentType = 2;
    prop1 = { value: 'Text' };
    prop2 = [{ value: 'Text' }];
    render() {
        return this.prop1.value + this.prop2[0].value;
    }
    getAsConstProp() {
        let a = { value: 'Text' };
        return a.value;
    }
}
