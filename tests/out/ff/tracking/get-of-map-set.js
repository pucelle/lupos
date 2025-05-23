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
export class TestObservingOfMapMember extends Component {
    map = new Map();
    list = [];
    getValue() {
        let $ref_0;
        $ref_0 = this.map.get(0);
        trackGet(this, "map");
        trackGet(this.map, "");
        trackGet($ref_0, "value");
        return $ref_0.value;
    }
    getValueQuery() {
        let $ref_0;
        $ref_0 = this.map.get(0);
        trackGet(this, "map");
        trackGet(this.map, "");
        $ref_0 && trackGet($ref_0, "value");
        return $ref_0?.value;
    }
    getValueByVariable() {
        let item = this.map.get(0);
        trackGet(this, "map");
        trackGet(this.map, "");
        trackGet(item, "value");
        return item.value;
    }
    findAtList() {
        let item = this.list.find(v => {
            trackGet(v, "value");
            return v.value === 0;
        });
        trackGet(this, "list");
        trackGet(this.list, "");
        trackGet(item, "value");
        return item.value;
    }
    /** Not supported yet. */
    filterList() {
        let items = this.list.filter(v => {
            trackGet(v, "value");
            return v.value === 0;
        });
        trackGet(this, "list");
        trackGet(this.list, "");
        return items.map(v => v.value);
    }
    /** Not supported yet. */
    sortList() {
        let items = this.list;
        items.sort();
        trackSet(items, "");
        return items.map(v => v.value);
    }
    /** Not supported yet. */
    sortFilteredList() {
        let items = this.list.filter(v => {
            trackGet(v, "value");
            return v.value === 0;
        });
        items.sort();
        trackGet(this, "list");
        trackGet(this.list, "");
        return items.map(v => v.value);
    }
    /** Not supported yet. */
    sortFilteredListWithoutAnyReference() {
        this.list.filter(v => v.value === 0)
            .sort()
            .map(v => v.value);
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
