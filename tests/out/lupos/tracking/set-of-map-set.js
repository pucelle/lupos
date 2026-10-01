import { Component } from 'lupos.html';
import { trackSet } from "lupos";
export class TestMap extends Component {
    map = new Map();
    set() {
        this.map.set(0, 1);
        trackSet(this.map, "");
    }
}
export class TestSet extends Component {
    set = new Set();
    add() {
        this.set.add(0);
        trackSet(this.set, "");
    }
}
/** Optional collection writes must not evaluate arguments for absent receivers. */
export class TestOptionalCollectionWrite {
    /** Skip both computed arguments when the Map is absent. */
    set(map, key, value) {
        map && trackSet(map, "");
        return map?.set(key(), value());
    }
    /** Preserve the mutation result and guard its tracking. */
    delete(map) {
        map && trackSet(map, "");
        return map?.delete(0);
    }
    /** Support nullable Set receivers without evaluating the value twice. */
    add(set, value) {
        set && trackSet(set, "");
        return set?.add(value());
    }
}
