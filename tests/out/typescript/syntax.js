import ModuleBox, { moduleValue } from './module';
var SyntaxState;
(function (SyntaxState) {
    SyntaxState[SyntaxState["Idle"] = 0] = "Idle";
    SyntaxState[SyntaxState["Ready"] = 1] = "Ready";
})(SyntaxState || (SyntaxState = {}));
var SyntaxConstants;
(function (SyntaxConstants) {
    SyntaxConstants.ready = SyntaxState.Ready;
})(SyntaxConstants || (SyntaxConstants = {}));
export class SyntaxBox {
    label;
    static count = 0;
    static {
        this.count++;
    }
    #value;
    constructor(label, value = 0) {
        this.label = label;
        this.#value = value;
    }
    get value() {
        return this.#value;
    }
    set value(value) {
        this.#value = value;
    }
    format(value) {
        return `${this.label}:${value}`;
    }
}
export function testDestructuringAndSpread(item, items) {
    let { value, nested: { value: nestedValue = 0 } = {} } = item;
    let [first = item, ...rest] = items;
    let key = 'value';
    let result = {
        ...item,
        [key]: first.value + value + nestedValue,
        rest,
        method() {
            return this.value;
        },
    };
    return result;
}
export function testExpressions(item, values) {
    let box = new SyntaxBox('box', item.value);
    let optional = item.nested?.value ?? item.callback?.(box.value) ?? 0;
    let arithmetic = values.reduce((sum, value) => sum + value, 0);
    let bitwise = (arithmetic << 1) | (arithmetic & 1);
    let comparison = box instanceof SyntaxBox && 'value' in item;
    let mutable = { discard: 1 };
    delete mutable.discard;
    return {
        optional,
        arithmetic,
        bitwise,
        comparison,
        type: typeof box,
        ignored: void mutable,
        literal: /syntax/giu,
        bigint: 1n,
        module: moduleValue,
        moduleBox: new ModuleBox(box.value),
    };
}
export function testFunctions(value) {
    let arrow = (addition = 1) => value + addition;
    let expression = function (addition) {
        return arrow(addition);
    };
    let generator = function* () {
        yield expression(1);
        yield* [expression(2)];
    };
    return [...generator()];
}
export async function testAsyncSyntax(value) {
    let imported = await import('./module');
    let resolved = await Promise.resolve(value.value);
    let results = [];
    async function* values() {
        yield resolved;
        yield imported.moduleValue.value;
    }
    for await (let item of values()) {
        results.push(item);
    }
    return new imported.default(results.join(',').length);
}
export function testControlFlow(record) {
    let total = 0;
    outer: for (let key in record) {
        try {
            if (!Object.hasOwn(record, key)) {
                continue outer;
            }
            total += record[key].value;
        }
        catch (error) {
            if (error instanceof Error) {
                throw error;
            }
        }
        finally {
            total++;
        }
    }
    return total;
}
export function testTypeWrappers(item) {
    let tuple = [item.value, item.nested?.value ?? 0];
    let asserted = item;
    let nonNull = asserted.nested.value;
    let legacyAssertion = item;
    let result = {
        value: tuple[0] + nonNull + legacyAssertion.value,
        state: SyntaxConstants.ready,
    };
    return result;
}
