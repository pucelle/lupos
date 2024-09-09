import * as L from '@pucelle/lupos.js';
import { Component } from '@pucelle/lupos.js';
class TestTemplateResult extends L.Component {
    static SlotContentType = 0;
    render() {
        return null;
    }
}
class TestTemplateResultList extends Component {
    static SlotContentType = 1;
    render() {
        return null;
    }
}
class TestText extends Component {
    static SlotContentType = 2;
    render() {
        return '';
    }
}
class TestUnionTypes extends Component {
    render() {
        return null;
    }
}
