import { Component } from '@pucelle/lupos.js';
import { trackSet } from "@pucelle/ff";
class TestArrayProp extends Component {
    prop = [{ value: 1 }];
    fixedIndex() {
        this.prop[0].value += 1;
        trackSet(this.prop[0], "value");
    }
    dynamicIndex() {
        let i = 0;
        this.prop[i].value += 1;
        trackSet(this.prop[i], "value");
    }
}
class TestAliasArrayTypeOfProp extends Component {
    prop = [{ value: 1 }];
    arrayAliasType() {
        this.prop[0].value += 1;
        trackSet(this.prop[0], "value");
    }
}
class TestArrayBroadcastingObservedToEachFn extends Component {
    prop = [{ value: 1 }];
    eachArrowFnNoBlocking() {
        this.prop.forEach(v => {
            trackSet(v, "value");
            return v.value += 1;
        });
    }
    eachArrowFn() {
        this.prop.forEach(v => { v.value += 1; trackSet(v, "value"); });
    }
    eachFn() {
        this.prop.forEach(function (v) { v.value += 1; trackSet(v, "value"); });
    }
}
