import { Component } from '@pucelle/lupos.js';
import { trackGet, trackSet } from "@pucelle/ff";
export class TestMap extends Component {
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
    size() {
        trackGet(this, "map");
        trackGet(this.map, "");
        return this.map.size;
    }
    clear() {
        this.map.clear();
        trackSet(this.map, "");
    }
}
export class TestSet extends Component {
    set = new Set();
    has() {
        trackGet(this, "set");
        trackGet(this.set, "");
        return this.set.has(0);
    }
    size() {
        trackGet(this, "set");
        trackGet(this.set, "");
        return this.set.size;
    }
    clear() {
        this.set.clear();
        trackSet(this.set, "");
    }
}
