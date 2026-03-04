import * as L from 'lupos.html';
import { Component } from 'lupos.html';
export class TestTemplateResult extends L.Component {
    static SlotContentType = 0;
    render() {
        return null;
    }
}
export class TestTemplateResultList extends Component {
    static SlotContentType = 1;
    render() {
        return null;
    }
}
export class TestText extends Component {
    static SlotContentType = 2;
    render() {
        return '';
    }
}
export class TestUnionTypes extends Component {
    render() {
        return null;
    }
}
