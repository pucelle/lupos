import { Component } from 'lupos.html';
import { trackGet, trackSet } from "lupos";
export class TestArrayIndex extends Component {
    prop = [{ value: 1 }];
    fixedIndex() {
        trackGet(this, "prop");
        trackGet(this.prop, 0);
        trackGet(this.prop[0], "value");
        return this.prop[0].value;
    }
    dynamicIndex() {
        let i = 0;
        trackGet(this, "prop");
        trackGet(this.prop, i);
        trackGet(this.prop[i], "value");
        return this.prop[i].value;
    }
    getLast() {
        trackGet(this, "prop");
        trackGet(this.prop, "");
        if (this.prop.length > 0) {
            let $ref_0 = this.prop.length - 1;
            trackGet(this.prop, $ref_0);
            trackGet(this.prop[$ref_0], "value");
            return this.prop[$ref_0].value;
        }
        return undefined;
    }
}
export class TestArrayTuple extends Component {
    prop = [1, 1];
    fixedIndex() {
        trackGet(this, "prop");
        trackGet(this.prop, 0, 1);
        return this.prop[0] + this.prop[1];
    }
}
export class TestArrayMethods extends Component {
    prop = [1];
    push() {
        this.prop.push(1);
        trackSet(this.prop, "");
    }
    filter(fn) {
        trackGet(this, "prop");
        trackGet(this.prop, "");
        return this.prop.filter(fn);
    }
    refedFilter(fn) {
        let $ref_0;
        let prop = this.prop;
        $ref_0 = prop;
        prop = $ref_0.filter(fn);
        trackGet(this, "prop");
        trackGet($ref_0, "");
        return prop;
    }
}
export class TestAliasArrayTypeOfProp extends Component {
    prop = [{ value: 1 }];
    arrayAliasType() {
        trackGet(this, "prop");
        trackGet(this.prop, 0);
        trackGet(this.prop[0], "value");
        return this.prop[0].value;
    }
}
export class TestArrayBroadcastingObservedToMapFn extends Component {
    prop = [{ value: 1 }];
    mapArrowFnNoBlocking() {
        trackGet(this, "prop");
        trackGet(this.prop, "");
        return this.prop.map(v => {
            trackGet(v, "value");
            return v.value;
        }).join('');
    }
    mapArrowFn() {
        trackGet(this, "prop");
        trackGet(this.prop, "");
        return this.prop.map(v => { trackGet(v, "value"); return v.value; }).join('');
    }
    mapFn() {
        trackGet(this, "prop");
        trackGet(this.prop, "");
        return this.prop.map(function (v) { trackGet(v, "value"); return v.value; }).join('');
    }
}
export class TestArrayElementsSpread {
    prop = [1];
    getProp() {
        trackGet(this.prop, "");
        return [...this.prop];
    }
    getSpreadProp() {
        let $ref_0;
        $ref_0 = this.getProp();
        trackGet($ref_0, "");
        return [...$ref_0];
    }
}
/** Optional Array reads retain guarded arguments and indexed access. */
export class TestOptionalArrayRead {
    /** Track collection reads through an optional native method. */
    includes(list) {
        list && trackGet(list, "");
        return list?.includes(1);
    }
    /** Skip an observed argument read when the list is absent. */
    includesArgument(list, data) {
        list && trackGet(list, "");
        return list?.includes((trackGet(data, "value"), data.value));
    }
    /** Nested reference assignments must not escape an optional initializer argument. */
    includesIndexedArgument(list, data, index) {
        let $ref_0;
        let found = list?.includes(($ref_0 = index(), trackGet(data, "values"), trackGet(data.values, $ref_0), data.values[$ref_0]));
        list && trackGet(list, "");
        return found;
    }
    /** Evaluate a computed index once and only for a present list. */
    element(list, index) {
        let $ref_0;
        return list?.[($ref_0 = index(), trackGet(list, $ref_0), $ref_0)];
    }
    /** Initializer references must remain inside the optional index guard. */
    elementVariable(list, index) {
        let $ref_0;
        let value = list?.[($ref_0 = index(), trackGet(list, $ref_0), $ref_0)];
        return value;
    }
    /** An inherited optional guard also skips the computed index. */
    elementNested(holder, index) {
        let $ref_0;
        holder && trackGet(holder, "list");
        return holder?.list[($ref_0 = index(), trackGet(holder.list, $ref_0), $ref_0)];
    }
    /** The list guard must not remove an independent optional receiver's guard. */
    elementOtherOptionalReceiver(list, other) {
        let $ref_0;
        return list?.[($ref_0 = other?.index ?? 0, trackGet(list, $ref_0), other && trackGet(other, "index"), $ref_0)];
    }
    /** Guard optional length tracking on nullable receivers. */
    length(list) {
        list && trackGet(list, "");
        return list?.length;
    }
    /** Tracking must not shift the positions of later call arguments. */
    callArguments(fn, data) {
        return fn?.((trackGet(data, "key"), data.key), (trackGet(data, "value"), data.value));
    }
    /** Keep spread dependencies guarded without altering the argument list. */
    callSpread(fn, values) {
        return fn?.(...(trackGet(values, ""), values));
    }
}
