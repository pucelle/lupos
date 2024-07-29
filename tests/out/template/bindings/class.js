import { Component, html } from '@pucelle/lupos.js';
import { trackGet } from "@pucelle/ff";
class TestClassBinding extends Component {
    className = 'className';
    booleanValue = true;
    testClassString() {
        trackGet(this, "className");
        return html `<div :class=${this.className} />`;
    }
    testClassArray() {
        trackGet(this, "className");
        return html `<div :class=${[this.className]} />`;
    }
    testClassObject() {
        trackGet(this, "booleanValue");
        return html `<div :class=${{ 'className': this.booleanValue }} />`;
    }
    testClassModifier() {
        trackGet(this, "booleanValue");
        return html `<div :class.prop=${this.booleanValue} />`;
    }
}
class TestStaticClassBinding extends Component {
    testClassString() {
        return html `<div :class=${'className'} />`;
    }
    testClassArray() {
        return html `<div :class=${['className']} />`;
    }
    testClassObject() {
        return html `<div :class=${{ 'className': true }} />`;
    }
    testClassModifier() {
        return html `<div :class.prop=${true} />`;
    }
}
