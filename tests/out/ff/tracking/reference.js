import { trackGet } from '@pucelle/ff';
import { Component } from '@pucelle/lupos.js';
let $ref_0;
export class TestRef extends Component {
    prop = { value: 1 };
    getProp() {
        trackGet(this, "prop");
        return this.prop;
    }
    getNextProp(_value) {
        trackGet(this, "prop");
        return this.prop;
    }
    doubleVariableDeclarationRef() {
        let i = this.prop.value, $ref_0 = this.getNextProp(i), j = $ref_0.value;
        trackGet(this, "prop");
        trackGet(this.prop, "value");
        trackGet($ref_0, "value");
        return j;
    }
    normalRef() {
        let $ref_0;
        $ref_0 = this.getProp();
        trackGet($ref_0, "value");
        return $ref_0.value;
    }
    *yieldRef() {
        let $ref_0;
        $ref_0 = this.getProp();
        trackGet($ref_0, "value");
        yield $ref_0.value;
    }
    ifRef() {
        let $ref_0;
        $ref_0 = this.getProp();
        trackGet($ref_0, "value");
        if ($ref_0.value) {
            return true;
        }
        return 0;
    }
    elseIfRef() {
        let $ref_0;
        if (Boolean(1)) {
            return true;
        }
        else {
            $ref_0 = this.getProp();
            trackGet($ref_0, "value");
            if ($ref_0.value) {
                return true;
            }
        }
        return 0;
    }
    multipleConditionalRef() {
        let $ref_0, $ref_1, $ref_2;
        $ref_0 = this.getProp();
        trackGet($ref_0, "value");
        return $ref_0.value
            ? ($ref_1 = this.getNextProp(0), trackGet($ref_1, "value"), $ref_1.value
                ? 1
                : 2) : ($ref_2 = this.getNextProp(1), trackGet($ref_2, "value"), $ref_2.value
            ? 3
            : 4);
    }
    multipleBinaryRef() {
        let $ref_0, $ref_1, $ref_2;
        $ref_0 = this.getProp();
        trackGet($ref_0, "value");
        return $ref_0.value || ($ref_1 = this.getNextProp(0), trackGet($ref_1, "value"), $ref_1.value) || ($ref_2 = this.getNextProp(1), trackGet($ref_2, "value"), $ref_2.value);
    }
    deepRef() {
        let $ref_0, $ref_1;
        $ref_0 = this.getProp();
        $ref_1 = this.getNextProp($ref_0.value);
        trackGet($ref_0, "value");
        trackGet($ref_1, "value");
        return $ref_1.value;
    }
    parameterRef(value = ($ref_0 = this.getProp(), $ref_0).value) {
        trackGet($ref_0, "value");
        return value;
    }
    indexRef() {
        let $ref_1;
        let a = [this.prop];
        let i = 0;
        $ref_1 = i++;
        trackGet(this, "prop");
        trackGet(a, "");
        trackGet(a[$ref_1], "value");
        return a[$ref_1].value;
    }
    forVariableInitializerRef() {
        let $ref_1 = this.getProp(), i = $ref_1.value;
        for (; i < 1; i++) {
            break;
        }
        trackGet($ref_1, "value");
        return 0;
    }
    forDoubleVariableInitializerRef() {
        let i = this.prop.value, $ref_1 = this.getNextProp(i), j = $ref_1.value;
        for (trackGet($ref_1, "value"); j < 1; j++) {
            break;
        }
        trackGet(this, "prop");
        trackGet(this.prop, "value");
        return 0;
    }
    forExpressionInitializerRef() {
        let $ref_1;
        let i;
        $ref_1 = this.getProp();
        i = $ref_1.value;
        for (; i < 1; i++) {
            break;
        }
        trackGet($ref_1, "value");
        return 0;
    }
    forConditionRef() {
        let $ref_1;
        for (let i = 0; ($ref_1 = this.getProp(), i < $ref_1.value); i++) {
            break;
        }
        trackGet($ref_1, "value");
        return 0;
    }
    forIncreasementRef() {
        let $ref_1;
        for (let i = 0; i < 1; ($ref_1 = this.getProp(), i += $ref_1.value)) {
            break;
        }
        trackGet($ref_1, "value");
        return 0;
    }
    caseDefaultRef() {
        let $ref_1, $ref_2;
        var a = '';
        switch (a) {
            case '1':
                $ref_1 = this.getProp();
                $ref_1.value;
                trackGet($ref_1, "value");
                break;
            default:
                $ref_2 = this.getProp();
                $ref_2.value;
                trackGet($ref_2, "value");
        }
        return 0;
    }
}
