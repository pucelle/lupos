import { Component } from 'lupos.html';
import { trackGet, trackSet } from "lupos";
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
    forOfKeys() {
        let sum = 0;
        for (let value of this.map.keys()) {
            sum += value;
        }
        trackGet(this, "map");
        trackGet(this.map, "");
        return sum;
    }
    forOfValues() {
        let sum = 0;
        for (let value of this.map.values()) {
            sum += value.value;
        }
        trackGet(this, "map");
        trackGet(this.map, "");
        return sum;
    }
    forOfKeyValues() {
        let sum = 0;
        for (let [key, value] of this.map) {
            sum += key + value.value;
            trackGet(value, "value");
        }
        trackGet(this, "map");
        trackGet(this.map, "");
        return sum;
    }
}
export class TestSet extends Component {
    set = new Set();
    has() {
        trackGet(this, "set");
        trackGet(this.set, "");
        return this.set.has(0);
    }
    forOf() {
        let sum = 0;
        for (let value of this.set) {
            sum += value;
        }
        trackGet(this, "set");
        trackGet(this.set, "");
        return sum;
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
