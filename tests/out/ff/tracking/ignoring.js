import { Component, RefBinding, CompiledTemplateResult, TemplateMaker, SlotPosition, HTMLMaker } from '@pucelle/lupos.js';
import { trackGet, trackSet, ComputedMaker, WatchMaker } from '@pucelle/ff';
const $html_0 = new HTMLMaker("<div></div>");
/*
<root>
    <div :ref=${this.ref} />
</root>
*/ const $template_0 = new TemplateMaker(function ($context) {
    let $node = $html_0.make();
    let $node_0 = $node.content.firstChild;
    let $binding_0 = new RefBinding($node_0, $context, ["el"]);
    $binding_0.update(function (refed) { this.ref = refed; trackSet(this, "ref"); });
    return {
        el: $node,
        position: new SlotPosition(1, $node_0),
        parts: [
            [$binding_0, 1]
        ]
    };
});
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
        this.$computedProp_computer = new ComputedMaker(this.$compute_computedProp, this.$reset_computedProp, this);
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
        trackGet(this, "computedProp");
        return this.$computedProp_computer.get();
    }
    $reset_computedProp() {
        trackSet(this, "computedProp");
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
export class TestIgnoringCustomTracked extends Component {
    prop = 1;
    read() {
        trackGet(this, '');
        return this.prop;
    }
    write() {
        trackSet(this, '');
        this.prop = 1;
    }
}
export class TestPreventIgnoringWatcherGetter extends Component {
    static SlotContentType = 0;
    ref;
    onCreated() {
        super.onCreated();
        this.$read_watcher = new WatchMaker(function () { trackGet(this, "ref"); return this.ref; }, this.read, this);
    }
    onConnected() {
        super.onConnected();
        this.$read_watcher.connect();
    }
    onWillDisconnect() {
        super.onWillDisconnect();
        this.$read_watcher.disconnect();
    }
    render() {
        return new CompiledTemplateResult($template_0, [], this);
    }
    $read_watcher = undefined;
    read(prop) {
        prop;
    }
}
