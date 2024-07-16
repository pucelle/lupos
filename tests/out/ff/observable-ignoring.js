import { Component } from '@pucelle/lupos.js';
import { trackGet } from "@pucelle/ff";
class TestIgnoringMethod extends Component {
    ignoreMethod() {
        return this.anyMethod();
    }
    anyMethod() {
        return '';
    }
}
class TestNotIgnoringFnPropertySignature extends Component {
    member = {
        property: () => '',
        method() { return ''; }
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
        trackGet(this, "prop1", "prop2");
        trackGet(this.prop2, "");
        return this.prop1.join('')
            + this.prop2.get(1);
    }
}
class TestIgnoringNothingReturnedMethod extends Component {
    prop = 1;
    nothingReturnedMethod() {
        this.prop;
    }
}
