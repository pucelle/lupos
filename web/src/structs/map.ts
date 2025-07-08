/** 
 * `K => V[]` Map Struct.
 * Good for purely adding.
 */
export class InternalListMap<K, V> {

	protected map: Map<K, V[]> = new Map()

	/** Has specified key existed. */
	hasKey(k: K): boolean {
		return this.map.has(k)
	}

	/** Get the count of all the keys. */
	keyCount(): number {
		return this.map.size
	}

	/** Get value list by associated key. */
	get(k: K): V[] | undefined {
		return this.map.get(k)
	}

	/** 
	 * Add a key and a value.
	 * Note it will not validate whether value exist,
	 * and will add value repeatedly although it exists.
	 */
	add(k: K, v: V) {
		let values = this.map.get(k)
		if (!values) {
			values = [v]
			this.map.set(k, values)
		}
		else {
			values.push(v)
		}
	}

	/** Delete a key value pair. */
	delete(k: K, v: V) {
		let values = this.map.get(k)
		if (values) {
			let index = values.indexOf(v)
			if (index > -1) {
				values.splice(index, 1)
				
				if (values.length === 0) {
					this.map.delete(k)
				}
			}
		}
	}

	/** Clear all the data. */
	clear() {
		this.map = new Map()
	}
}


/** 
 * `K => Set<V>` Map Struct.
 * Good for dynamically adding & deleting.
 */
export class InternalSetMap<K, V> {

	protected map: Map<K, Set<V>> = new Map();

	/** Iterate all values. */
	*values(): Iterable<V> {
		for (let list of this.map.values()) {
			yield* list
		}
	}

	/** Iterate each key and associated value list. */
	entries(): Iterable<[K, Set<V>]> {
		return this.map.entries()
	}

	/** Iterate each key and each associated value after flatted. */
	*flatEntries(): Iterable<[K, V]> {
		for (let [key, values] of this.map.entries()) {
			for (let value of values) {
				yield [key, value]
			}
		}
	}

	/** Get the count of all the keys. */
	keyCount(): number {
		return this.map.size
	}

	/** Get value list by associated key. */
	get(k: K): Set<V> | undefined {
		return this.map.get(k)
	}

	/** Add a key value pair. */
	add(k: K, v: V) {
		let values = this.map.get(k)
		if (!values) {
			values = new Set()
			this.map.set(k, values)
		}

		values.add(v)
	}

	/** Add a key and several values. */
	addSeveral(k: K, vs: V[]) {
		if (vs.length === 0) {
			return
		}

		let values = this.map.get(k)
		if (!values) {
			values = new Set(vs)
			this.map.set(k, values)
		}
		else {
			for (let v of vs) {
				values.add(v)
			}
		}
	}

	/** Delete a key value pair. */
	delete(k: K, v: V) {
		let values = this.map.get(k)
		if (values) {
			values.delete(v)

			if (values.size === 0) {
				this.map.delete(k)
			}
		}
	}
}