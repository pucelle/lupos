import { Component } from '@pucelle/lupos.js';
import { trackGet } from "@pucelle/ff";
class TestIgnoringStringIndex extends Component {
    prop = '1';
    ignoreStringIndex() {
        trackGet(this, "prop");
        return this.prop[0];
    }
}
// This feature is not implemented.
// class TestIgnoringNotObservedInstanceAsProperty extends Component {
// 	notObservedInstance = new NotObservedClass()
// 	ignoreNonObservedInstance() {
// 		return this.notObservedInstance.value
// 	}
// }
// class NotObservedClass {
// 	value: number = 1
// }
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
        trackGet(this.prop1, "");
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
