import { Component } from '@pucelle/lupos.js';
import { trackGet, trackSet } from "@pucelle/ff";
class TestArrayIndex extends Component {
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
class TestArrayTuple extends Component {
    prop = [1, 1];
    fixedIndex() {
        trackGet(this, "prop");
        trackGet(this.prop, 0, 1);
        return this.prop[0] + this.prop[1];
    }
}
class TestArrayMethods extends Component {
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
class TestAliasArrayTypeOfProp extends Component {
    prop = [{ value: 1 }];
    arrayAliasType() {
        trackGet(this, "prop");
        trackGet(this.prop, "");
        trackGet(this.prop[0], "value");
        return this.prop[0].value;
    }
}
class TestArrayBroadcastingObservedToMapFn extends Component {
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
