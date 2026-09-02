import ModuleBox, {moduleValue, type ModuleValue} from './module'


enum SyntaxState {
	Idle,
	Ready,
}

namespace SyntaxConstants {
	export const ready = SyntaxState.Ready
}

interface SyntaxItem {
	value: number
	nested?: {value: number}
	callback?: (value: number) => number
}

type SyntaxResult<T> = Readonly<{
	value: T
	state: SyntaxState
}>


export class SyntaxBox {
	static count = 0

	static {
		this.count++
	}

	#value: number

	constructor(public readonly label: string, value = 0) {
		this.#value = value
	}

	get value() {
		return this.#value
	}

	set value(value: number) {
		this.#value = value
	}

	format(value: number): string
	format(value: string): string
	format(value: number | string): string {
		return `${this.label}:${value}`
	}
}


export function testDestructuringAndSpread(item: SyntaxItem, items: SyntaxItem[]) {
	let {value, nested: {value: nestedValue = 0} = {}} = item
	let [first = item, ...rest] = items
	let key = 'value' as const

	let result = {
		...item,
		[key]: first.value + value + nestedValue,
		rest,
		method() {
			return this.value
		},
	} satisfies SyntaxItem & {rest: SyntaxItem[]; method(): number}

	return result
}

export function testExpressions(item: SyntaxItem, values: number[]) {
	let box = new SyntaxBox('box', item.value)
	let optional = item.nested?.value ?? item.callback?.(box.value) ?? 0
	let arithmetic = values.reduce((sum, value) => sum + value, 0)
	let bitwise = (arithmetic << 1) | (arithmetic & 1)
	let comparison = box instanceof SyntaxBox && 'value' in item
	let mutable: {discard?: number} = {discard: 1}
	delete mutable.discard

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
	}
}

export function testFunctions(value: number) {
	let arrow = (addition = 1) => value + addition
	let expression = function (addition: number) {
		return arrow(addition)
	}
	let generator = function* () {
		yield expression(1)
		yield* [expression(2)]
	}

	return [...generator()]
}

export async function testAsyncSyntax(value: ModuleValue) {
	let imported = await import('./module')
	let resolved = await Promise.resolve(value.value)
	let results: number[] = []

	async function* values() {
		yield resolved
		yield imported.moduleValue.value
	}

	for await (let item of values()) {
		results.push(item)
	}

	return new imported.default(results.join(',').length)
}

export function testControlFlow(record: Record<string, SyntaxItem>) {
	let total = 0

	outer: for (let key in record) {
		try {
			if (!Object.hasOwn(record, key)) {
				continue outer
			}

			total += record[key].value
		}
		catch (error: unknown) {
			if (error instanceof Error) {
				throw error
			}
		}
		finally {
			total++
		}
	}

	return total
}

export function testTypeWrappers(item: SyntaxItem) {
	let tuple = [item.value, item.nested?.value ?? 0] as const
	let asserted = item as SyntaxItem
	let nonNull = asserted.nested!.value
	let legacyAssertion = <SyntaxItem>item
	let result: SyntaxResult<number> = {
		value: tuple[0] + nonNull + legacyAssertion.value,
		state: SyntaxConstants.ready,
	}

	return result
}
