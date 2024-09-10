import {} from '@pucelle/ff';
import { Component } from '@pucelle/lupos.js';
class Parent extends Component {
    onConnected() {
        super.onConnected();
        Component.setContextVariable(this, "prop");
    }
    onDisconnected() {
        super.onDisconnected();
        Component.deleteContextVariables(this);
    }
    prop = 1;
}
class Child extends Component {
    onConnected() {
        super.onConnected();
        this.#prop_declared_by = Component.getContextVariableDeclared(this, "prop");
    }
    onDisconnected() {
        super.onDisconnected();
        this.#prop_declared_by = undefined;
        Component.deleteContextVariables(this);
    }
    #prop_declared_by = undefined;
    get prop() {
        return this.#prop_declared_by?.["prop"];
    }
}
