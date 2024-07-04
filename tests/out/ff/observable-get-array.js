import { trackGet } from "@pucelle/ff";
import { Component } from '@pucelle/lupos.js';
class TestArrayProp extends Component {
    prop = [{ value: 1 }];
    fixedIndex() {
        trackGet(this, "prop");
        trackGet(this.prop, "");
        trackGet(this.prop[0], "value");
        return this.prop[0].value + '';
    }
    dynamicIndex() {
        let i = 0;
        trackGet(this, "prop");
        trackGet(this.prop, "");
        trackGet(this.prop[i], "value");
        return this.prop[i].value + '';
    }
}
class TestAliasArrayTypeOfProp extends Component {
    prop = [{ value: 1 }];
    arrayAliasType() {
        trackGet(this, "prop");
        trackGet(this.prop, "");
        trackGet(this.prop[0], "value");
        return this.prop[0].value + '';
    }
}
class TestArrayBroadcastingObservedToMapFn extends Component {
    prop = [{ value: 1 }];
    mapArrowFnNoBlocking() {
        trackGet(this, "prop");
        return this.prop.map(v => { trackGet(v, "value"); return v.value; }).join('');
    }
    mapArrowFn() {
        trackGet(this, "prop");
        return this.prop.map(v => { trackGet(v, "value"); return v.value; }).join('');
    }
    mapFn() {
        trackGet(this, "prop");
        return this.prop.map(function (v) { trackGet(v, "value"); return v.value; }).join('');
    }
}
