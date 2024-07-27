import { setContext, useContext } from '@pucelle/ff';
import { Component } from '@pucelle/lupos.js';
class Parent extends Component {
    onConnected() {
        super.onConnected();
        Parent.setContextVariable(this, "prop");
    }
    onDisconnected() {
        super.onDisconnected();
        Parent.deleteContextVariables(this);
    }
    prop = 1;
}
class Child extends Component {
    onConnected() {
        super.onConnected();
        this.#prop_declared_by = Child.getContextVariableDeclared(this, "prop");
    }
    onDisconnected() {
        super.onDisconnected();
        this.#prop_declared_by = undefined;
        Child.deleteContextVariables(this);
    }
    #prop_declared_by = undefined;
    get prop() {
        return this.#prop_declared_by?.["prop"];
    }
}
