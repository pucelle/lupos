import { trackGet, trackSet } from '@pucelle/ff';
import { Component } from '@pucelle/lupos.js';
export class TestArrayIndex extends Component {
    prop = [{ value: 1 }];
    fixedIndex() {
        trackGet(this, "prop");
        trackGet(this.prop, "");
        trackGet(this.prop[0], "value");
        return this.prop[0].value;
    }
    dynamicIndex() {
        let i = 0;
        trackGet(this, "prop");
        trackGet(this.prop, "");
        trackGet(this.prop[i], "value");
        return this.prop[i].value;
    }
    getLast() {
        trackGet(this, "prop");
        trackGet(this.prop, "");
        if (this.prop.length > 0) {
            let $ref_0 = this.prop.length - 1;
            trackGet(this.prop[$ref_0], "value");
            return this.prop[$ref_0].value;
        }
        return undefined;
    }
}
export class TestArrayTuple extends Component {
    prop = [1, 1];
    fixedIndex() {
        trackGet(this, "prop");
        trackGet(this.prop, 0, 1);
        return this.prop[0] + this.prop[1];
    }
}
export class TestArrayMethods extends Component {
    prop = [1];
    push() {
        this.prop.push(1);
        trackSet(this.prop, "");
    }
    filter(fn) {
        trackGet(this, "prop");
        trackGet(this.prop, "");
        return this.prop.filter(fn);
    }
    refedFilter(fn) {
        let $ref_0;
        let prop = this.prop;
        $ref_0 = prop;
        prop = $ref_0.filter(fn);
        trackGet(this, "prop");
        trackGet($ref_0, "");
        return prop;
    }
}
export class TestAliasArrayTypeOfProp extends Component {
    prop = [{ value: 1 }];
    arrayAliasType() {
        trackGet(this, "prop");
        trackGet(this.prop, "");
        trackGet(this.prop[0], "value");
        return this.prop[0].value;
    }
}
export class TestArrayBroadcastingObservedToMapFn extends Component {
    prop = [{ value: 1 }];
    mapArrowFnNoBlocking() {
        trackGet(this, "prop");
        trackGet(this.prop, "");
        return this.prop.map(v => {
            trackGet(v, "value");
            return v.value;
        }).join('');
    }
    mapArrowFn() {
        trackGet(this, "prop");
        trackGet(this.prop, "");
        return this.prop.map(v => { trackGet(v, "value"); return v.value; }).join('');
    }
    mapFn() {
        trackGet(this, "prop");
        trackGet(this.prop, "");
        return this.prop.map(function (v) { trackGet(v, "value"); return v.value; }).join('');
    }
}
export class TestArrayElementSpread {
    prop = [1];
    getProp() {
        trackGet(this.prop, "");
        return [...this.prop];
    }
}
