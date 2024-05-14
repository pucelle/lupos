import { Component, beginTrack, endTrack, untrack, enqueue } from '@pucelle/lupos.js';
import { computed, effect, observable, watch } from '@pucelle/ff';
class C1 extends Component {
    prop = 1;
    #prop2 = undefined;
    #compute_prop2() {
        return this.prop + 1;
    }
    #reset_prop2() { this.#prop2 = undefined; }
    get prop2() {
        if (this.#prop2 !== undefined) {
            return this.#prop2;
        }
        beginTrack(this.#reset_prop2, this);
        try {
            this.#prop2 = this.#compute_prop2();
        }
        catch (err) {
            console.error(err);
        }
        finally {
            endTrack();
        }
    }
}
class C2 extends Component {
    onConnected() { super.onConnected(); this.#enqueue_onPropChangeEffect(); }
    onDisconnected() { super.onDisconnected(); untrack(this.#enqueue_onPropChangeEffect, this); }
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
class C3 extends Component {
    onConnected() { super.onConnected(); this.#enqueue_onPropChange(); }
    onDisconnected() { super.onDisconnected(); untrack(this.#enqueue_onPropChange, this); }
    prop = 1;
    #property_onPropChange = undefined;
    #property_get_onPropChange() {
        return this.prop;
    }
    #enqueue_onPropChange() {
        enqueue(this.onPropChange, this);
    }
    onPropChange() {
        beginTrack(this.#enqueue_onPropChange, this);
        let newValue = undefined;
        try {
            newValue = this.#property_get_onPropChange();
        }
        catch (err) {
            console.error(err);
        }
        finally {
            endTrack();
        }
        if (newValue !== this.#property_onPropChange) {
            this.#property_onPropChange = newValue;
            console.log(prop);
        }
    }
}
class C4 extends Component {
    onConnected() { super.onConnected(); this.#enqueue_onPropChange(); }
    onDisconnected() { super.onDisconnected(); untrack(this.#enqueue_onPropChange, this); }
    prop = 1;
    #property_onPropChange = undefined;
    #property_get_onPropChange() { return this.prop; }
    #enqueue_onPropChange() {
        enqueue(this.onPropChange, this);
    }
    onPropChange() {
        beginTrack(this.#enqueue_onPropChange, this);
        let newValue = undefined;
        try {
            newValue = this.#property_get_onPropChange();
        }
        catch (err) {
            console.error(err);
        }
        finally {
            endTrack();
        }
        if (newValue !== this.#property_onPropChange) {
            this.#property_onPropChange = newValue;
            console.log(prop);
        }
    }
}
class C5 {
    constructor() { this.#enqueue_onPropChangeEffect(); }
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
