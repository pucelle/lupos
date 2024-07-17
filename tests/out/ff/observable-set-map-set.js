import { Component } from '@pucelle/lupos.js';
import { trackSet } from "@pucelle/ff";
class TestMap extends Component {
    map = new Map();
    set() {
        this.map.set(0, 1);
        trackSet(this.map, "");
    }
}
class TestSet extends Component {
    set = new Set();
    add() {
        this.set.add(0);
        trackSet(this.set, "");
    }
}
