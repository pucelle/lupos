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
