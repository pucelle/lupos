import { Observed, computed, effect, watch, beginTrack, endTrack, trackSet, trackGet, untrack, enqueue } from '@pucelle/ff';
import { Component } from '@pucelle/lupos.js';
class TestComputed extends Component {
    prop = 1;
    #prop2 = undefined;
    #need_compute_prop2 = true;
    #compute_prop2() {
        return this.prop + 1;
    }
    #reset_prop2() { this.#need_compute_prop2 = true; }
    get prop2() {
        if (!this.#need_compute_prop2) {
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
        this.#need_compute_prop2 = false;
        return this.#prop2;
    }
}
class TestEffect extends Component {
    onConnected() {
        super.onConnected();
        this.#enqueue_onPropChangeEffect();
    }
    onDisconnected() {
        super.onDisconnected();
        untrack(this.#enqueue_onPropChangeEffect, this);
    }
    prop = 1;
    #enqueue_onPropChangeEffect() {
        enqueue(this.onPropChangeEffect, this);
    }
    onPropChangeEffect() {
        beginTrack(this.#enqueue_onPropChangeEffect, this);
        try {
            console.log(this.prop);
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
        this.#enqueue_onPropChange();
    }
    onDisconnected() {
        super.onDisconnected();
        untrack(this.#enqueue_onPropChange, this);
    }
    prop = 1;
    #property_onPropChange = undefined;
    #property_get_onPropChange() {
        trackGet(this, "prop");
        return this.prop;
    }
    #enqueue_onPropChange() {
        enqueue(this.onPropChange, this);
    }
    onPropChange() {
        beginTrack(this.#enqueue_onPropChange, this);
        let new_value = undefined;
        try {
            new_value = this.#property_get_onPropChange();
        }
        catch (err) {
            console.error(err);
        }
        finally {
            endTrack();
        }
        if (new_value !== this.#property_onPropChange) {
            this.#property_onPropChange = new_value;
            console.log(prop);
        }
    }
}
class TestWatchCallback extends Component {
    onConnected() {
        super.onConnected();
        this.#enqueue_onPropChange();
    }
    onDisconnected() {
        super.onDisconnected();
        untrack(this.#enqueue_onPropChange, this);
    }
    prop = 1;
    #property_onPropChange = undefined;
    #property_get_onPropChange() { return this.prop; }
    #enqueue_onPropChange() {
        enqueue(this.onPropChange, this);
    }
    onPropChange() {
        beginTrack(this.#enqueue_onPropChange, this);
        let new_value = undefined;
        try {
            new_value = this.#property_get_onPropChange();
        }
        catch (err) {
            console.error(err);
        }
        finally {
            endTrack();
        }
        if (new_value !== this.#property_onPropChange) {
            this.#property_onPropChange = new_value;
            console.log(prop);
        }
    }
}
class TestObservedImplemented {
    constructor() {
        this.#enqueue_onPropChangeEffect();
    }
    prop = 1;
    #enqueue_onPropChangeEffect() {
        enqueue(this.onPropChangeEffect, this);
    }
    onPropChangeEffect() {
        beginTrack(this.#enqueue_onPropChangeEffect, this);
        try {
            console.log(this.prop);
        }
        catch (err) {
            console.error(err);
        }
        finally {
            endTrack();
        }
    }
}
