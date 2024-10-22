import { untrack, beginTrack, endTrack, trackSet, enqueueUpdate, trackGet } from '@pucelle/ff';
import { Component } from '@pucelle/lupos.js';
export class TestComputed extends Component {
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
    onConnected() {
        super.onConnected();
        this.#reset_prop2();
    }
    onWillDisconnect() {
        super.onWillDisconnect();
        untrack(this.#reset_prop2, this);
    }
}
export class TestEffect extends Component {
    propRead = 1;
    propWrite = 1;
    onConnected() {
        super.onConnected();
        this.onPropChangeEffect();
    }
    onWillDisconnect() {
        super.onWillDisconnect();
        untrack(this.#enqueue_onPropChangeEffect, this);
    }
    #enqueue_onPropChangeEffect() {
        enqueueUpdate(this.onPropChangeEffect, this);
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
export class TestWatchProperty extends Component {
    prop = 1;
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
    #values_onPropChange;
    #enqueue_onPropChange() {
        enqueueUpdate(this.#compare_onPropChange, this);
    }
    #compare_onPropChange() {
        beginTrack(this.#enqueue_onPropChange, this);
        let values_0, values_1;
        try {
            values_0 = this.prop;
            values_1 = this.prop;
            trackGet(this, "prop");
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
    }
    onPropChange(prop) {
        console.log(prop);
    }
    #values_onImmediatePropChange = new Array(1);
    #enqueue_onImmediatePropChange() {
        enqueueUpdate(this.#compare_onImmediatePropChange, this);
    }
    #compare_onImmediatePropChange() {
        beginTrack(this.#enqueue_onImmediatePropChange, this);
        let values_0;
        try {
            values_0 = this.prop;
            trackGet(this, "prop");
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
export class TestWatchCallback extends Component {
    prop = 1;
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
    #values_onPropChange;
    #enqueue_onPropChange() {
        enqueueUpdate(this.#compare_onPropChange, this);
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
        enqueueUpdate(this.#compare_onImmediatePropChange, this);
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
export class TestObservedImplemented {
    prop = 1;
    constructor() {
        this.onPropChangeEffect();
    }
    #enqueue_onPropChangeEffect() {
        enqueueUpdate(this.onPropChangeEffect, this);
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
