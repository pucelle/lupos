import { Component } from 'lupos.html';
import { trackSet, trackGet } from "lupos";
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
    testArrowFunctionBlockBody() {
        return () => {
            trackGet(this, "prop");
            return this.prop === 0 ? 0 : 1;
        };
    }
    testArrowFunctionNonBlockBody() {
        return () => {
            trackGet(this, "prop");
            return this.prop === 0 ? 0 : 1;
        };
    }
    testParameterWithDefaultValue(p = this.prop) {
        trackGet(this, "prop", "list");
        trackGet(this.list, "");
        return p + this.list.length;
    }
    testParameterWithDeepDefaultValue(p = this.prop ?? 0) {
        trackGet(this, "prop", "list");
        trackGet(this.list, "");
        return p + this.list.length;
    }
    async asyncSetProps(prop) {
        await Promise.resolve();
        this.prop = prop;
        trackSet(this, "prop");
    }
}
