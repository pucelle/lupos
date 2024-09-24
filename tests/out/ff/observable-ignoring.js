import { Component } from '@pucelle/lupos.js';
import { untrack, beginTrack, endTrack, trackSet, trackGet } from '@pucelle/ff';
class TestIgnoringStringIndex extends Component {
    prop = '1';
    ignoreStringIndex() {
        trackGet(this, "prop");
        return this.prop[0];
    }
}
class TestIgnoringLifeFunction extends Component {
    prop;
    constructor() {
        super();
        this.prop = 0;
    }
    onConnected() {
        this.prop = 1;
    }
    onWillDisconnect() {
        this.prop = 2;
    }
}
class TestIgnoringMethod extends Component {
    ignoreMethod() {
        return this.anyMethod();
    }
    anyMethod() {
        return 0;
    }
}
class TestNotIgnoringFnPropertySignature extends Component {
    member = {
        property: () => 0,
        method() { return 0; }
    };
    notIgnoreFnProperty() {
        trackGet(this, "member");
        trackGet(this.member, "property");
        return this.member.property() + this.member.method();
    }
}
class TestIgnoringInternalMethods extends Component {
    prop1 = [1, 2];
    prop2 = new Map([[1, 2]]);
    ignoreArrayMethods() {
        let prop1 = this.prop1;
        trackGet(this, "prop1", "prop2");
        trackGet(prop1, "");
        trackGet(this.prop2, "");
        return prop1.join('')
            + this.prop2.get(1);
    }
}
class TestIgnoringNothingReturnedMethod extends Component {
    prop = 1;
    nothingReturnedMethod() {
        this.prop;
    }
    async nothingReturnedAsyncMethod() {
        this.prop;
    }
}
class TestIgnoringReadonlyPrivate extends Component {
    prop = 1;
    readMethod() {
        return this.prop;
    }
}
class TestIgnoringWriteonlyPrivate extends Component {
    prop = 1;
    readMethod() {
        this.prop = 2;
    }
}
class TestIgnoringOfPrivateComputedProperty extends Component {
    prop = 1;
    onConnected() {
        super.onConnected();
        this.#reset_computedProp();
    }
    onWillDisconnect() {
        super.onWillDisconnect();
        untrack(this.#reset_computedProp, this);
    }
    readMethod() {
        trackGet(this, "computedProp");
        return this.computedProp;
    }
    #computedProp = undefined;
    #needs_compute_computedProp = true;
    #compute_computedProp() {
        return this.prop;
    }
    #reset_computedProp() { this.#needs_compute_computedProp = true; }
    get computedProp() {
        if (!this.#needs_compute_computedProp) {
            return this.#computedProp;
        }
        beginTrack(this.#reset_computedProp, this);
        try {
            let newValue = this.#compute_computedProp();
            if (newValue !== this.#computedProp) {
                this.#computedProp = newValue;
                trackSet(this, "computedProp");
            }
        }
        catch (err) {
            console.error(err);
        }
        finally {
            endTrack();
        }
        this.#needs_compute_computedProp = false;
        return this.#computedProp;
    }
}
