import { Component } from 'lupos.html';
import { trackSet } from "lupos";
export class TestArrayProp extends Component {
    prop = [{ value: 1 }];
    fixedIndex() {
        this.prop[0].value += 1;
        trackSet(this.prop[0], "value");
    }
    dynamicIndex() {
        let i = 0;
        this.prop[i].value += 1;
        trackSet(this.prop[i], "value");
    }
}
export class TestAliasArrayTypeOfProp extends Component {
    prop = [{ value: 1 }];
    arrayAliasType() {
        this.prop[0].value += 1;
        trackSet(this.prop[0], "value");
    }
}
export class TestArrayBroadcastingObservedToEachFn extends Component {
    prop = [{ value: 1 }];
    eachArrowFnNoBlocking() {
        this.prop.forEach(v => {
            trackSet(v, "value");
            return v.value += 1;
        });
    }
    eachArrowFn() {
        this.prop.forEach(v => { v.value += 1; trackSet(v, "value"); });
    }
    eachFn() {
        this.prop.forEach(function (v) { v.value += 1; trackSet(v, "value"); });
    }
}
export class TestArrayElementsSet extends Component {
    list = [];
    setAtIndex() {
        this.list[0] = 1;
        trackSet(this.list, 0);
    }
    toggleElementSet(item) {
        if (this.list.includes(item)) {
            this.list.splice(this.list.indexOf(item), 1);
        }
        else {
            this.list.push(item);
        }
        trackSet(this.list, "");
    }
    elementAssignment(item) {
        if (this.list.includes(item)) {
            this.list.splice(this.list.indexOf(item), 1);
            trackSet(this.list, "");
        }
        else {
            this.list = [item];
            trackSet(this, "list");
        }
    }
}
/** Optional Array mutations must retain their results and evaluation order. */
export class TestOptionalArrayWrite {
    /** Track a push only when the receiver is present. */
    push(list) {
        list && trackSet(list, "");
        return list?.push(1);
    }
    /** Skip a computed argument when the list is absent. */
    pushArgument(list, value) {
        list && trackSet(list, "");
        return list?.push(value());
    }
    /** Evaluate a computed receiver once and keep its argument guarded. */
    pushReceiver(read, value) {
        let $ref_0;
        $ref_0 = read();
        $ref_0 && trackSet($ref_0, "");
        return $ref_0?.push(value());
    }
    /** Guard a zero-argument mutation for nullable receivers. */
    pop(list) {
        list && trackSet(list, "");
        return list?.pop();
    }
    /** Removing the first element is also a collection mutation. */
    shift(list) {
        list && trackSet(list, "");
        return list?.shift();
    }
    /** Reordering mutates the original collection while returning it. */
    reverse(list) {
        list && trackSet(list, "");
        return list?.reverse();
    }
    /** Replacing element values is a mutation, not a collection read. */
    fill(list) {
        list && trackSet(list, "");
        return list?.fill(3);
    }
    /** Copying within the same collection must emit set tracking. */
    copyWithin(list) {
        list && trackSet(list, "");
        return list?.copyWithin(0, 1);
    }
}
