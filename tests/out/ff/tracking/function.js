import { Component } from '@pucelle/lupos.js';
import { trackSet, trackGet } from "@pucelle/lupos";
export class TestFunction extends Component {
    prop = 0;
    list = [{ value: 1 }];
    testInstantlyRun() {
        let value = this.list.map(item => item.value)[0];
        this.prop = value;
        trackSet(this, "prop");
    }
    testNonInstantlyRun() {
        let getValue = () => {
            trackGet(this, "list");
            trackGet(this.list, "");
            return this.list.map(item => {
                trackGet(item, "value");
                return item.value;
            })[0];
        };
        this.prop = getValue();
        trackSet(this, "prop");
    }
}
