import { Component } from 'lupos.html';
import { trackGet } from "lupos";
export class TestCommonSyntax extends Component {
    item = { value: 1, nested: { value: 2 } };
    items = [this.item];
    record = { item: this.item };
    testTryCatchFinally() {
        let value = 0;
        try {
            value = this.item.value;
        }
        catch (error) {
            value = error instanceof Error ? this.item.value : 0;
        }
        finally {
            this.item.nested?.value;
        }
        trackGet(this, "item");
        trackGet(this.item, "value", "nested");
        this.item.nested && trackGet(this.item.nested, "value");
        return value;
    }
    testForIn() {
        let total = 0;
        for (let key in this.record) {
            total += this.record[key].value;
            trackGet(this.record[key], "value");
        }
        trackGet(this, "record");
        trackGet(this.record, "");
        return total;
    }
    async testForAwaitOf() {
        let total = 0;
        for await (let item of this.items) {
            total += item.value;
            trackGet(item, "value");
        }
        trackGet(this, "items");
        trackGet(this.items, "");
        return total;
    }
    testDestructuringAndSpread() {
        let { value, nested = { value: 0 } } = this.item;
        let [first = this.item, ...rest] = this.items;
        let clone = { ...first, value: first.value + nested.value };
        trackGet(this, "item", "items");
        trackGet(this.item, "value", "nested");
        trackGet(this.items, 0);
        trackGet(first, "");
        trackGet(nested, "value");
        trackGet(rest, "");
        return [value, clone, ...rest];
    }
    testOptionalAndComputedAccess(key) {
        trackGet(this, "item");
        this.item && trackGet(this.item, key);
        return this.item?.[key] ?? (trackGet(this.item, "nested"), this.item.nested && trackGet(this.item.nested, "value"), this.item.nested?.value) ?? 0;
    }
    testFunctionForms() {
        let arrow = (value = this.item.value) => {
            trackGet(this.item, "value");
            return value + this.item.value;
        };
        let expression = function* (item) {
            trackGet(item, "value");
            yield item.value;
            trackGet(item, "nested");
            item.nested && trackGet(item.nested, "value");
            yield* [item.nested?.value ?? 0];
        };
        trackGet(this, "item");
        return [arrow(), ...expression(this.item)];
    }
}
