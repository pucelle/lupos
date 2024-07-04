import { trackGet } from "@pucelle/ff";
import { Component } from '@pucelle/lupos.js';
class TestMap extends Component {
    map = new Map();
    has() {
        trackGet(this, "map");
        trackGet(this.map, "");
        return this.map.has('');
    }
    get() {
        trackGet(this, "map");
        trackGet(this.map, "");
        return this.map.get('');
    }
}
class TestSet extends Component {
    set = new Set();
    has() {
        trackGet(this, "set");
        trackGet(this.set, "");
        return this.set.has('') + '';
    }
}
