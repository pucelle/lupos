import { untrack, beginTrack, endTrack, trackSet, computeTrackingValues, compareTrackingValues, enqueueUpdate, trackGet } from '@pucelle/ff';
import { Component } from '@pucelle/lupos.js';
export class TestComputed extends Component {
    prop = 1;
    $prop2 = undefined;
    $tracking_values_prop2 = null;
    $needs_compute_prop2 = true;
    $compute_prop2() {
        trackGet(this, "prop");
        return this.prop + 1;
    }
    $compare_prop2() {
        if (!this.needs_compute_prop2) {
            if (compareTrackingValues(this.$reset_prop2, this, this.$tracking_values_prop2)) {
                this.$reset_prop2();
            }
        }
    }
    $reset_prop2() {
        this.$needs_compute_prop2 = true;
        this.$tracking_values_prop2 = null;
    }
    get prop2() {
        if (!this.$needs_compute_prop2) {
            return this.$prop2;
        }
        beginTrack(this.$reset_prop2, this);
        try {
            let newValue = this.$compute_prop2();
            if (newValue !== this.$prop2) {
                this.$prop2 = newValue;
                trackSet(this, "prop2");
            }
        }
        catch (err) {
            console.error(err);
        }
        finally {
            endTrack();
        }
        this.$needs_compute_prop2 = false;
        this.$tracking_values_prop2 = computeTrackingValues(this.$reset_prop2, this);
        return this.$prop2;
    }
    onConnected() {
        super.onConnected();
        this.$compare_prop2();
    }
    onWillDisconnect() {
        super.onWillDisconnect();
        untrack(this.$reset_prop2, this);
    }
}
export class TestComputedDerived extends TestComputed {
    $compute_prop2() {
        trackGet(this, "prop");
        return this.prop + 2;
    }
}
export class TestEffect extends Component {
    propRead = 1;
    propWrite = 1;
    onConnected() {
        super.onConnected();
        this.$compare_onPropChangeEffect();
    }
    onWillDisconnect() {
        super.onWillDisconnect();
        untrack(this.$enqueue_onPropChangeEffect, this);
    }
    $tracking_values_onPropChangeEffect = null;
    $compare_onPropChangeEffect() {
        if (!this.$tracking_values_onPropChangeEffect || compareTrackingValues(this.$enqueue_onPropChangeEffect, this, this.$tracking_values_onPropChangeEffect)) {
            this.$run_onPropChangeEffect();
        }
    }
    $enqueue_onPropChangeEffect() {
        enqueueUpdate(this.$run_onPropChangeEffect, this);
    }
    $run_onPropChangeEffect() {
        beginTrack(this.$enqueue_onPropChangeEffect, this);
        try {
            this.onPropChangeEffect();
        }
        catch (err) {
            console.error(err);
        }
        finally {
            endTrack();
        }
        this.$tracking_values_onPropChangeEffect = computeTrackingValues(this.$enqueue_onPropChangeEffect, this);
    }
    onPropChangeEffect() {
        this.propWrite = this.propRead;
        trackGet(this, "propRead");
        trackSet(this, "propWrite");
    }
}
export class TestEffectDerived extends TestEffect {
    onPropChangeEffect() {
        this.propWrite = this.propRead + 1;
        trackGet(this, "propRead");
        trackSet(this, "propWrite");
    }
}
export class TestWatchProperty extends Component {
    prop = 1;
    onConnected() {
        super.onConnected();
        this.$compare_onPropChange();
    }
    onWillDisconnect() {
        super.onWillDisconnect();
        untrack(this.$enqueue_onPropChange, this);
    }
    $values_onPropChange;
    $enqueue_onPropChange() {
        enqueueUpdate(this.$compare_onPropChange, this);
    }
    $compare_onPropChange() {
        beginTrack(this.$enqueue_onPropChange, this);
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
        if (!this.$values_onPropChange) {
            this.$values_onPropChange = new Array(2);
            this.$values_onPropChange[0] = values_0;
            this.$values_onPropChange[1] = values_1;
        }
        else if (values_0 !== this.$values_onPropChange[0] || values_1 !== this.$values_onPropChange[1]) {
            this.$values_onPropChange[0] = values_0;
            this.$values_onPropChange[1] = values_1;
            this.onPropChange(values_0, values_1);
        }
    }
    onPropChange(prop) {
        console.log(prop);
    }
}
export class TestWatchPropertyDerived extends TestWatchProperty {
    onPropChange(prop) {
        console.log(prop + 1);
    }
}
export class TestWatchCallback extends Component {
    prop = 1;
    onConnected() {
        super.onConnected();
        this.$compare_onPropChange();
    }
    onWillDisconnect() {
        super.onWillDisconnect();
        untrack(this.$enqueue_onPropChange, this);
    }
    $values_onPropChange;
    $enqueue_onPropChange() {
        enqueueUpdate(this.$compare_onPropChange, this);
    }
    $compare_onPropChange() {
        beginTrack(this.$enqueue_onPropChange, this);
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
        if (!this.$values_onPropChange) {
            this.$values_onPropChange = new Array(1);
            this.$values_onPropChange[0] = values_0;
        }
        else if (values_0 !== this.$values_onPropChange[0]) {
            this.$values_onPropChange[0] = values_0;
            this.onPropChange(values_0);
        }
    }
    onPropChange(prop) {
        console.log(prop);
    }
}
export class TestWatchCallbackDerived extends TestWatchCallback {
    onPropChange(prop) {
        console.log(prop + 1);
    }
}
export class TestObservedImplemented {
    prop = 1;
    constructor() {
        this.$compare_onPropChangeEffect();
    }
    $tracking_values_onPropChangeEffect = null;
    $compare_onPropChangeEffect() {
        if (!this.$tracking_values_onPropChangeEffect || compareTrackingValues(this.$enqueue_onPropChangeEffect, this, this.$tracking_values_onPropChangeEffect)) {
            this.$run_onPropChangeEffect();
        }
    }
    $enqueue_onPropChangeEffect() {
        enqueueUpdate(this.$run_onPropChangeEffect, this);
    }
    $run_onPropChangeEffect() {
        beginTrack(this.$enqueue_onPropChangeEffect, this);
        try {
            this.onPropChangeEffect();
        }
        catch (err) {
            console.error(err);
        }
        finally {
            endTrack();
        }
        this.$tracking_values_onPropChangeEffect = computeTrackingValues(this.$enqueue_onPropChangeEffect, this);
    }
    onPropChangeEffect() {
        console.log(this.prop);
        trackGet(this, "prop");
    }
}
