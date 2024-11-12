import { Component } from '@pucelle/lupos.js';
import { ComputedMaker, trackGet } from '@pucelle/ff';
export class TestIgnoringStringIndex extends Component {
    prop = '1';
    ignoreStringIndex() {
        trackGet(this, "prop");
        return this.prop[0];
    }
}
export class TestIgnoringLifeFunction extends Component {
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
export class TestIgnoringMethod extends Component {
    ignoreMethod() {
        return this.anyMethod();
    }
    anyMethod() {
        return 0;
    }
}
export class TestNotIgnoringFnPropertySignature extends Component {
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
export class TestIgnoringInternalMethods extends Component {
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
export class TestIgnoringNothingReturnedMethod extends Component {
    prop = 1;
    nothingReturnedMethod() {
        this.prop;
    }
    async nothingReturnedAsyncMethod() {
        this.prop;
    }
}
export class TestIgnoringReadonlyPrivate extends Component {
    prop = 1;
    readMethod() {
        return this.prop;
    }
    destructedReadMethod() {
        let { prop } = this;
        trackGet(this, "prop");
        return prop;
    }
}
export class TestIgnoringWriteonlyPrivate extends Component {
    prop = 1;
    readToAvoidNeverReadDiagnostic() {
        this.prop;
    }
    writeMethod() {
        this.prop = 2;
    }
}
export class TestIgnoringOfPrivateComputedProperty extends Component {
    prop = 1;
    onCreated() {
        super.onCreated();
        this.$computedProp_computer = new ComputedMaker(this.$compute_computedProp, this);
    }
    onConnected() {
        super.onConnected();
        this.$computedProp_computer.connect();
    }
    onWillDisconnect() {
        super.onWillDisconnect();
        this.$computedProp_computer.disconnect();
    }
    readMethod() {
        trackGet(this, "computedProp");
        return this.computedProp;
    }
    $computedProp_computer = undefined;
    $compute_computedProp() {
        return this.prop;
    }
    get computedProp() {
        return this.$computedProp_computer.get();
    }
}
export class TestIgnoringNonPrimitiveObject extends Component {
    el = document.body;
    read() {
        trackGet(this, "el");
        return this.el.style.display;
    }
    write() {
        this.el.style.display = '';
    }
}
