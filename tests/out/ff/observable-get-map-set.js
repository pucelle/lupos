import { Component } from '@pucelle/lupos.js';
import { trackGet } from "@pucelle/ff";
class TestMap extends Component {
    map = new Map();
    has() {
        trackGet(this, "map");
        trackGet(this.map, "");
        return this.map.has(0);
    }
    get() {
        trackGet(this, "map");
        trackGet(this.map, "");
        return this.map.get(0);
    }
}
class TestSet extends Component {
    set = new Set();
    has() {
        trackGet(this, "set");
        trackGet(this.set, "");
        return this.set.has(0);
    }
}
