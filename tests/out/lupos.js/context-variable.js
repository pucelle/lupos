import {} from '../../../web/out';
import { Component } from '@pucelle/lupos.js';
export class Parent extends Component {
    prop = 1;
    onConnected() {
        super.onConnected();
        Component.setContextVariable(this, "prop");
    }
    onWillDisconnect() {
        super.onWillDisconnect();
        Component.deleteContextVariables(this);
    }
}
export class Child extends Component {
    $prop_declared_by = undefined;
    get prop() {
        return this.$prop_declared_by?.["prop"];
    }
    onConnected() {
        super.onConnected();
        this.$prop_declared_by = Component.getContextVariableDeclared(this, "prop");
    }
    onWillDisconnect() {
        super.onWillDisconnect();
        this.$prop_declared_by = undefined;
        Component.deleteContextVariables(this);
    }
}
