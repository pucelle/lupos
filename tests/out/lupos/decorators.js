import { Observed, Connectable } from '../../../web/out';
import { Component } from '@pucelle/lupos.js';
import { Computed, trackGet, trackSet, Effector, Watcher } from "@pucelle/lupos";
export class TestComputed extends Component {
    prop = 1;
    $compute_prop2() {
        trackGet(this, "prop");
        return this.prop + 1;
    }
    get prop2() {
        trackGet(this, "prop2");
        return this.$prop2_computer.get();
    }
    $reset_prop2() {
        trackSet(this, "prop2");
    }
    onCreated() {
        super.onCreated();
        this.$prop2_computer = new Computed(this.$compute_prop2, this.$reset_prop2, this);
    }
    onConnected() {
        super.onConnected();
        this.$prop2_computer.connect();
    }
    onWillDisconnect() {
        super.onWillDisconnect();
        this.$prop2_computer.disconnect();
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
    onCreated() {
        super.onCreated();
        this.$onPropChangeEffect_effector = new Effector(this.onPropChangeEffect, this);
    }
    onConnected() {
        super.onConnected();
        this.$onPropChangeEffect_effector.connect();
    }
    onWillDisconnect() {
        super.onWillDisconnect();
        this.$onPropChangeEffect_effector.disconnect();
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
    onCreated() {
        super.onCreated();
        this.$onPropChange_watcher = new Watcher(function () { trackGet(this, 'prop'); return this.prop; }, this.onPropChange, this);
    }
    onConnected() {
        super.onConnected();
        this.$onPropChange_watcher.connect();
    }
    onWillDisconnect() {
        super.onWillDisconnect();
        this.$onPropChange_watcher.disconnect();
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
    onCreated() {
        super.onCreated();
        this.$onPropChange_watcher = new Watcher(function () { trackGet(this, "prop"); return this.prop; }, this.onPropChange, this);
    }
    onConnected() {
        super.onConnected();
        this.$onPropChange_watcher.connect();
    }
    onWillDisconnect() {
        super.onWillDisconnect();
        this.$onPropChange_watcher.disconnect();
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
        this.$onPropChangeEffect_effector = new Effector(this.onPropChangeEffect, this);
        this.$onPropChangeEffect_effector.connect();
    }
    onPropChangeEffect() {
        console.log(this.prop);
        trackGet(this, "prop");
    }
}
export class TestConnectable {
    prop = 1;
    onCreated() { this.$onPropChangeEffect_effector = new Effector(this.onPropChangeEffect, this); }
    onConnected() { this.$onPropChangeEffect_effector.connect(); }
    onWillDisconnect() { this.$onPropChangeEffect_effector.disconnect(); }
    onPropChangeEffect() {
        console.log(this.prop);
        trackGet(this, "prop");
    }
}
