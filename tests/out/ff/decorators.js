import { untrack, beginTrack, endTrack, trackSet, trackGet, enqueue } from '@pucelle/ff';
import { Component } from '@pucelle/lupos.js';
class TestComputed extends Component {
    onConnected() {
        super.onConnected();
        this.#reset_prop2();
    }
    onWillDisconnect() {
        super.onWillDisconnect();
        untrack(this.#reset_prop2, this);
    }
    prop = 1;
    #prop2 = undefined;
    #needs_compute_prop2 = true;
    #compute_prop2() {
        trackGet(this, "prop");
        return this.prop + 1;
    }
    #reset_prop2() { this.#needs_compute_prop2 = true; }
    get prop2() {
        if (!this.#needs_compute_prop2) {
            return this.#prop2;
        }
        beginTrack(this.#reset_prop2, this);
        try {
            let newValue = this.#compute_prop2();
            if (newValue !== this.#prop2) {
                this.#prop2 = newValue;
                trackSet(this, "prop2");
            }
        }
        catch (err) {
            console.error(err);
        }
        finally {
            endTrack();
        }
        this.#needs_compute_prop2 = false;
        return this.#prop2;
    }
}
class TestEffect extends Component {
    onConnected() {
        super.onConnected();
        this.onPropChangeEffect();
    }
    onWillDisconnect() {
        super.onWillDisconnect();
        untrack(this.#enqueue_onPropChangeEffect, this);
    }
    propRead = 1;
    propWrite = 1;
    #enqueue_onPropChangeEffect() {
        enqueue(this.onPropChangeEffect, this);
    }
    onPropChangeEffect() {
        beginTrack(this.#enqueue_onPropChangeEffect, this);
        try {
            this.propWrite = this.propRead;
            trackGet(this, "propRead");
            trackSet(this, "propWrite");
        }
        catch (err) {
            console.error(err);
        }
        finally {
            endTrack();
        }
    }
}
class TestWatchProperty extends Component {
    onConnected() {
        super.onConnected();
        this.#compare_onPropChange();
        this.#compare_onImmediatePropChange();
    }
    onWillDisconnect() {
        super.onWillDisconnect();
        untrack(this.#enqueue_onPropChange, this);
        untrack(this.#enqueue_onImmediatePropChange, this);
    }
    prop = 1;
    #values_onPropChange;
    #enqueue_onPropChange() {
        enqueue(this.#compare_onPropChange, this);
    }
    #compare_onPropChange() {
        beginTrack(this.#enqueue_onPropChange, this);
        let values_0, values_1;
        try {
            values_0 = this.prop;
            values_1 = this.prop;
        }
        catch (err) {
            console.error(err);
        }
        finally {
            endTrack();
        }
        if (!this.#values_onPropChange) {
            this.#values_onPropChange = new Array(2);
            this.#values_onPropChange[0] = values_0;
            this.#values_onPropChange[1] = values_1;
        }
        else if (values_0 !== this.#values_onPropChange[0] || values_1 !== this.#values_onPropChange[1]) {
            this.#values_onPropChange[0] = values_0;
            this.#values_onPropChange[1] = values_1;
            this.onPropChange(values_0, values_1);
        }
        trackGet(this, "prop");
    }
    onPropChange(prop) {
        console.log(prop);
    }
    #values_onImmediatePropChange = new Array(1);
    #enqueue_onImmediatePropChange() {
        enqueue(this.#compare_onImmediatePropChange, this);
    }
    #compare_onImmediatePropChange() {
        beginTrack(this.#enqueue_onImmediatePropChange, this);
        let values_0;
        try {
            values_0 = this.prop;
        }
        catch (err) {
            console.error(err);
        }
        finally {
            endTrack();
        }
        if (values_0 !== this.#values_onImmediatePropChange[0]) {
            this.#values_onImmediatePropChange[0] = values_0;
            this.onImmediatePropChange(values_0);
        }
        trackGet(this, "prop");
    }
    onImmediatePropChange(prop) {
        console.log(prop);
    }
}
class TestWatchCallback extends Component {
    onConnected() {
        super.onConnected();
        this.#compare_onPropChange();
        this.#compare_onImmediatePropChange();
    }
    onWillDisconnect() {
        super.onWillDisconnect();
        untrack(this.#enqueue_onPropChange, this);
        untrack(this.#enqueue_onImmediatePropChange, this);
    }
    prop = 1;
    #values_onPropChange;
    #enqueue_onPropChange() {
        enqueue(this.#compare_onPropChange, this);
    }
    #compare_onPropChange() {
        beginTrack(this.#enqueue_onPropChange, this);
        let values_0;
        try {
            values_0 = function () { trackGet(this, "prop"); return this.prop; }.call(this);
        }
        catch (err) {
            console.error(err);
        }
        finally {
            endTrack();
        }
        if (!this.#values_onPropChange) {
            this.#values_onPropChange = new Array(1);
            this.#values_onPropChange[0] = values_0;
        }
        else if (values_0 !== this.#values_onPropChange[0]) {
            this.#values_onPropChange[0] = values_0;
            this.onPropChange(values_0);
        }
    }
    onPropChange(prop) {
        console.log(prop);
    }
    #values_onImmediatePropChange = new Array(1);
    #enqueue_onImmediatePropChange() {
        enqueue(this.#compare_onImmediatePropChange, this);
    }
    #compare_onImmediatePropChange() {
        beginTrack(this.#enqueue_onImmediatePropChange, this);
        let values_0;
        try {
            values_0 = function () { trackGet(this, "prop"); return this.prop; }.call(this);
        }
        catch (err) {
            console.error(err);
        }
        finally {
            endTrack();
        }
        if (values_0 !== this.#values_onImmediatePropChange[0]) {
            this.#values_onImmediatePropChange[0] = values_0;
            this.onImmediatePropChange(values_0);
        }
    }
    onImmediatePropChange(prop) {
        console.log(prop);
    }
}
class TestObservedImplemented {
    constructor() {
        this.onPropChangeEffect();
    }
    prop = 1;
    #enqueue_onPropChangeEffect() {
        enqueue(this.onPropChangeEffect, this);
    }
    onPropChangeEffect() {
        beginTrack(this.#enqueue_onPropChangeEffect, this);
        try {
            console.log(this.prop);
            trackGet(this, "prop");
        }
        catch (err) {
            console.error(err);
        }
        finally {
            endTrack();
        }
    }
}
