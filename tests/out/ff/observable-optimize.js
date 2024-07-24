import { Observed, trackGet } from '@pucelle/ff';
import { Component } from '@pucelle/lupos.js';
class TestOptimizing extends Component {
    prop = { value: 1 };
    moveConditionalConditionOutward() {
        if (this.prop) { }
        trackGet(this, "prop");
        return '';
    }
    moveConditionalConditionOutwardInterrupted() {
        trackGet(this, "prop");
        if (this.prop) {
            return;
        }
        return '';
    }
    eliminateOwnRepetitiveAfterReturn() {
        this.prop;
        trackGet(this, "prop");
        if (1) {
            return;
        }
        this.prop;
        return '';
    }
    *persistOwnRepetitiveAfterYield() {
        this.prop;
        trackGet(this, "prop");
        yield 0;
        this.prop;
    }
    async persistOwnRepetitiveAfterAwait() {
        this.prop;
        trackGet(this, "prop");
        await Promise.resolve();
        this.prop;
        return '';
    }
    eliminateRepetitiveProp() {
        this.prop;
        if (1) {
            this.prop;
        }
        trackGet(this, "prop");
        return '';
    }
    eliminateRepetitivePropAfterReturn() {
        if (1) {
            return '';
        }
        this.prop;
        trackGet(this, "prop");
        if (1) {
            return this.prop;
        }
        return '';
    }
    mergeAllIfElseBranches() {
        if (1) {
            this.prop;
        }
        else if (1) {
            this.prop;
        }
        else {
            this.prop;
        }
        trackGet(this, "prop");
        return '';
    }
    mergeAllConditionalBranches() {
        1 ? this.prop : this.prop;
        trackGet(this, "prop");
        return '';
    }
    mergeAllBinaryBranches() {
        this.prop && this.prop || this.prop;
        trackGet(this, "prop");
        return '';
    }
    avoidEliminatingSameNameButDifferentVariable() {
        let prop = { value: 1 };
        prop.value;
        if (1) {
            let prop = { value: 2 };
            prop.value;
            trackGet(prop, "value");
        }
        trackGet(prop, "value");
        return '';
    }
    moveIterationInitializerOutward() {
        let i = this.prop.value;
        for (; i < 1; i++) { }
        trackGet(this, "prop");
        trackGet(this.prop, "value");
        return '';
    }
    moveInternalReturnedIterationInitializerOutward() {
        let i = this.prop.value;
        trackGet(this, "prop");
        trackGet(this.prop, "value");
        for (; i < 1; i++) {
            return;
        }
        return '';
    }
    moveIterationConditionOutward() {
        for (let i = 0; i < this.prop.value; i++) { }
        trackGet(this, "prop");
        trackGet(this.prop, "value");
        return '';
    }
    preventMoveIterationConditionOutward() {
        let _ref_0, props = [this.prop, this.prop];
        for (let i = 0; (_ref_0 = i, trackGet(props[_ref_0], "value"), i < props[_ref_0].value); i++) { }
        trackGet(this, "prop");
        trackGet(props, "");
        return '';
    }
    moveIterationIncreasementOutward() {
        for (let i = 0; i < 1; i += this.prop.value) { }
        trackGet(this, "prop");
        trackGet(this.prop, "value");
        return '';
    }
    moveForIterationContentTrackingOuter() {
        for (let i = 0; i < 1; i++) {
            this.prop.value;
        }
        trackGet(this, "prop");
        trackGet(this.prop, "value");
        return '';
    }
    moveWhileIterationContentTrackingOuter() {
        let index = 0;
        while (index < 1) {
            this.prop.value;
        }
        trackGet(this, "prop");
        trackGet(this.prop, "value");
        return '';
    }
    preventMovingIterationContentWhenIncludesLocalVariables() {
        let props = [this.prop, this.prop];
        for (let i = 0; i < 1; i++) {
            props[i].value;
            trackGet(props[i], "value");
        }
        trackGet(this, "prop");
        trackGet(props, "");
        return '';
    }
}
