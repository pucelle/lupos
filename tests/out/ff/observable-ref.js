import { Observed, trackGet } from '@pucelle/ff';
import { Component } from '@pucelle/lupos.js';
var _ref_0;
class TestRef extends Component {
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
        let i = this.prop.value, _ref_0 = this.getNextProp(i), j = _ref_0.value;
        trackGet(this, "prop");
        trackGet(this.prop, "value");
        trackGet(_ref_0, "value");
        return j;
    }
    normalRef() {
        var _ref_0;
        _ref_0 = this.getProp();
        trackGet(_ref_0, "value");
        return _ref_0.value;
    }
    *yieldRef() {
        var _ref_0;
        _ref_0 = this.getProp();
        trackGet(_ref_0, "value");
        yield _ref_0.value;
    }
    ifRef() {
        var _ref_0;
        _ref_0 = this.getProp();
        trackGet(_ref_0, "value");
        if (_ref_0.value) {
            return true;
        }
        return 0;
    }
    elseIfRef() {
        var _ref_0;
        if (Boolean(1)) {
            return true;
        }
        else {
            _ref_0 = this.getProp();
            trackGet(_ref_0, "value");
            if (_ref_0.value) {
                return true;
            }
        }
        return 0;
    }
    multipleConditionalRef() {
        var _ref_0, _ref_1, _ref_2;
        _ref_0 = this.getNextProp(0);
        _ref_1 = this.getNextProp(1);
        _ref_2 = this.getProp();
        trackGet(_ref_2, "value");
        return _ref_2.value
            ? (trackGet(_ref_0, "value"), _ref_0.value
                ? 1
                : 2) : (trackGet(_ref_1, "value"), _ref_1.value
            ? 3
            : 4);
    }
    multipleBinaryRef() {
        var _ref_0, _ref_1, _ref_2;
        _ref_1 = this.getProp();
        trackGet(_ref_1, "value");
        return _ref_1.value || (_ref_0 = this.getNextProp(0), trackGet(_ref_0, "value"), _ref_0.value) || (_ref_2 = this.getNextProp(1), trackGet(_ref_2, "value"), _ref_2.value);
    }
    deepRef() {
        var _ref_0, _ref_1;
        _ref_0 = this.getProp();
        _ref_1 = this.getNextProp(_ref_0.value);
        trackGet(_ref_0, "value");
        trackGet(_ref_1, "value");
        return _ref_1.value;
    }
    parameterRef(value = (_ref_0 = this.getProp(), _ref_0).value) {
        trackGet(_ref_0, "value");
        return value;
    }
    indexRef() {
        var _ref_1;
        let a = [this.prop];
        let i = 0;
        _ref_1 = i++;
        trackGet(this, "prop");
        trackGet(a, "");
        trackGet(a[_ref_1], "value");
        return a[_ref_1].value;
    }
    forVariableInitializerRef() {
        let _ref_1 = this.getProp(), i = _ref_1.value;
        for (; i < 1; i++) {
            break;
        }
        trackGet(_ref_1, "value");
        return 0;
    }
    forDoubleVariableInitializerRef() {
        let i = this.prop.value, _ref_1 = this.getNextProp(i), j = _ref_1.value;
        for (trackGet(_ref_1, "value"); j < 1; j++) {
            break;
        }
        trackGet(this, "prop");
        trackGet(this.prop, "value");
        return 0;
    }
    forExpressionInitializerRef() {
        var _ref_1;
        let i;
        _ref_1 = this.getProp();
        i = _ref_1.value;
        for (; i < 1; i++) {
            break;
        }
        trackGet(_ref_1, "value");
        return 0;
    }
    forConditionRef() {
        var _ref_1;
        for (let i = 0; (_ref_1 = this.getProp(), i < _ref_1.value); i++) {
            break;
        }
        trackGet(_ref_1, "value");
        return 0;
    }
    forIncreasementRef() {
        var _ref_1;
        for (let i = 0; i < 1; (_ref_1 = this.getProp(), i += _ref_1.value)) {
            break;
        }
        trackGet(_ref_1, "value");
        return 0;
    }
    caseDefaultRef() {
        var a = '';
        switch (a) {
            case '1':
                var _ref_1;
                _ref_1 = this.getProp();
                _ref_1.value;
                trackGet(_ref_1, "value");
                break;
            default:
                var _ref_1;
                _ref_1 = this.getProp();
                _ref_1.value;
                trackGet(_ref_1, "value");
        }
        return 0;
    }
}
