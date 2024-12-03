/** Remove item from list. */
export function removeFromList<T>(list: T[], item: T) {
	let index = list.indexOf(item)
	if (index > -1) {
		list.splice(index, 1)
	}
}


/** Add item to list without repetition. */
export function addToList<T>(list: T[], item: T) {
	if (!list.includes(item)) {
		list.push(item)
	}
}


/** Clean list by removing null or undefined values. */
export function cleanList<T>(list: T[]): NonNullable<T>[] {
	return list.filter(v => v !== null && v !== undefined) as NonNullable<T>[]
}


/** Convert `string` to camel case type: `a-bc` -> `abc`. */
export function toCamelCase(string: string): string {
	return string.replace(/[-_ ][a-z]/gi, m0 => m0[1].toUpperCase())
}


/** Uppercase the first character of `string`: `abc` -> `Abc` */
export function toCapitalize(string: string): string {
	return string.slice(0, 1).toUpperCase() + string.slice(1)
}


/** 
 * Create a group map in `K => V[]` format, just like SQL `group by` statement.
 * @param pairFn get key and value pair by it.
 */
export function groupBy<T, K, V>(list: Iterable<T>, pairFn: (value: T) => [K, V]): Map<K, V[]> {
	let map: Map<K, V[]> = new Map()

	for (let item of list) {
		let [key, value] = pairFn(item)

		let group = map.get(key)
		if (!group) {
			group = []
			map.set(key, group)
		}

		group.push(value)
	}

	return map
}


/** Deeply compare two JSON objects. */
export function deepEqual(a: unknown, b: unknown, maxDepth: number = 10): boolean {
	if (a === b) {
		return true
	}

	if (maxDepth === 0) {
		return false
	}

	if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) {
		return false
	}

	// Array.
	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length !== b.length) {
			return false
		}
		
		return a.every(function(ai, index) {
			return deepEqual(ai, b[index], maxDepth - 1)
		})
	}

	// Plain object.
	else {
		let keysA = Object.keys(a)
		let keysB = Object.keys(b)
		
		if (keysA.length !== keysB.length) {
			return false
		}

		for (let key of keysA) {
			let valueA = (a as any)[key]
			let valueB = (b as any)[key]

			if (!deepEqual(valueA, valueB, maxDepth - 1)) {
				return false
			}
		}

		return true
	}
}
