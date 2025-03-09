import { trackGet, trackSet } from '@pucelle/ff';
import { Component } from '@pucelle/lupos.js';
export class TestOptimizing extends Component {
    prop = { value: 1 };
    moveConditionalConditionOutward() {
        if (this.prop) { }
        trackGet(this, "prop");
        return 0;
    }
    moveConditionalConditionOutwardInterrupted() {
        trackGet(this, "prop");
        if (this.prop) {
            return;
        }
        return 0;
    }
    eliminateOwnRepetitiveAfterReturn() {
        this.prop;
        trackGet(this, "prop");
        if (1) {
            return;
        }
        this.prop;
        return 0;
    }
    *persistOwnRepetitiveAfterYield() {
        this.prop;
        trackGet(this, "prop");
        yield 0;
        this.prop;
        trackGet(this, "prop");
    }
    async persistOwnRepetitiveAfterAwait() {
        this.prop;
        trackGet(this, "prop");
        await Promise.resolve();
        this.prop;
        return 0;
    }
    eliminateRepetitiveProp() {
        this.prop;
        if (1) {
            this.prop;
        }
        trackGet(this, "prop");
        return 0;
    }
    eliminateRepetitivePropAfterReturn() {
        if (1) {
            return 0;
        }
        this.prop;
        trackGet(this, "prop");
        if (1) {
            return this.prop;
        }
        return 0;
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
        return 0;
    }
    preventMergeIfForContinued() {
        for (let i = 0; i < 1; i++) {
            if (1) {
                if (i) {
                    continue;
                }
                this.prop = { value: 2 };
                trackSet(this, "prop");
            }
            else {
                this.prop = { value: 2 };
                trackSet(this, "prop");
            }
        }
    }
    preventMergeIfOnlyBranch() {
        if (1) {
            this.prop;
            trackGet(this, "prop");
        }
        return 0;
    }
    mergeAllSwitchCaseBranches() {
        var a = '';
        switch (a) {
            case '1':
                this.prop;
                break;
            case '2':
                this.prop;
                break;
            default:
                this.prop;
        }
        trackGet(this, "prop");
        return 0;
    }
    mergeNoDefaultSwitchCaseBranches() {
        var a = '';
        switch (a) {
            case '1':
                this.prop;
                break;
            case '2':
                this.prop;
                break;
        }
        trackGet(this, "prop");
        return 0;
    }
    mergeReturnedSwitchCaseBranches() {
        var a = '';
        trackGet(this, "prop");
        switch (a) {
            case '1': return this.prop;
            case '2': return this.prop;
        }
        return 0;
    }
    mergeAllConditionalBranches() {
        1 ? this.prop : this.prop;
        trackGet(this, "prop");
        return 0;
    }
    mergeAllBinaryBranches() {
        this.prop && this.prop || this.prop;
        trackGet(this, "prop");
        return 0;
    }
    eliminateContentByConditionBinaryAndRight() {
        if (this.prop && (trackGet(this.prop, "value"), this.prop.value) && this.prop) {
            this.prop.value;
        }
        trackGet(this, "prop");
        return 0;
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
        return 0;
    }
    moveIterationInitializerOutward() {
        let i = this.prop.value;
        for (; i < 1; i++) { }
        trackGet(this, "prop");
        trackGet(this.prop, "value");
        return 0;
    }
    moveInternalReturnedIterationInitializerOutward() {
        let i = this.prop.value;
        trackGet(this, "prop");
        trackGet(this.prop, "value");
        for (; i < 1; i++) {
            return;
        }
        return 0;
    }
    moveIterationConditionOutward() {
        for (let i = 0; i < this.prop.value; i++) { }
        trackGet(this, "prop");
        trackGet(this.prop, "value");
        return 0;
    }
    moveIterationIncreasementOutward() {
        for (let i = 0; i < 1; i += this.prop.value) { }
        trackGet(this, "prop");
        trackGet(this.prop, "value");
        return 0;
    }
    moveForIterationContentTrackingOuter() {
        for (let i = 0; i < 1; i++) {
            this.prop.value;
        }
        trackGet(this, "prop");
        trackGet(this.prop, "value");
        return 0;
    }
    moveWhileIterationContentTrackingOuter() {
        let index = 0;
        while (index < 1) {
            this.prop.value;
        }
        trackGet(this, "prop");
        trackGet(this.prop, "value");
        return 0;
    }
    preventMovingIterationConditionWhenIncludesLocalVariables() {
        let $ref_0;
        let props = [this.prop];
        for (let i = 0; i < props[$ref_0 = i].value; i++) {
            trackGet(props, $ref_0);
            trackGet(props[$ref_0], "value");
        }
        trackGet(this, "prop");
        return 0;
    }
    preventMovingIterationContentWhenIncludesLocalVariables() {
        let props = [this.prop];
        for (let i = 0; i < 1; i++) {
            props[i].value;
            trackGet(props, i);
            trackGet(props[i], "value");
        }
        trackGet(this, "prop");
        return 0;
    }
    moveArrayMapContentTrackingOuter() {
        let a = [0];
        a.map(v => {
            return v + this.prop.value;
        });
        trackGet(this, "prop");
        trackGet(this.prop, "value");
        return 0;
    }
    preventTrackingOfCallback() {
        this.prop.value = 1;
        trackSet(this.prop, "value");
        return () => {
            this.prop.value = 2;
            trackSet(this.prop, "value");
        };
    }
}
