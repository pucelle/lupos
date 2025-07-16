import {InternalListMap, InternalSetMap} from './map'


/** 
 * `K1 -> K2 -> V` Map Struct.
 * Index single value by a pair of object keys.
 * Both `K1` and `K2` must be object type.
 */
export class InternalWeakerPairKeysMap<K1 extends object, K2 extends object, V> {

	private map: WeakMap<K1, WeakMap<K2, V>> = new WeakMap();

	/** Get associated value by key pair. */
	get(k1: K1, k2: K2): V | undefined {
		let sub = this.map.get(k1)
		if (!sub) {
			return undefined
		}

		return sub.get(k2)
	}

	/** Set key pair and associated value. */
	set(k1: K1, k2: K2, v: V) {
		let sub = this.map.get(k1)
		if (!sub) {
			sub = new Map()
			this.map.set(k1, sub)
		}

		sub.set(k2, v)
	}
}


/** 
 * `K1 -> K2 -> V[]` Map Struct.
 * Index value list by a pair of keys.
 * `K1` must be object type.
 */
export class InternalWeakPairKeysListMap<K1 extends object, K2, V> {
	
	protected map: WeakMap<K1, InternalListMap<K2, V>> = new WeakMap();

	/** Get associated value list by key pair. */
	get(k1: K1, k2: K2): V[] | undefined {
		let sub = this.map.get(k1)
		if (!sub) {
			return undefined
		}

		return sub.get(k2)
	}

	/** Add key pair and value. */
	add(k1: K1, k2: K2, v: V) {
		let sub = this.map.get(k1)
		if (!sub) {
			sub = new InternalListMap()
			this.map.set(k1, sub)
		}

		sub.add(k2, v)
	}

	/** Delete a key pair and associated value. */
	delete(k1: K1, k2: K2, v: V) {
		let sub = this.map.get(k1)
		if (sub) {
			sub.delete(k2, v)

			if (sub.keyCount() === 0) {
				this.map.delete(k1)
			}
		}
	}
}



/** 
 * `K1 -> K2 -> Set<V>` Map Struct.
 * Index a set of values by a pair of keys.
 * `K1` must be object type.
 */
export class InternalWeakPairKeysSetMap<K1 extends object, K2, V> {

	protected map: WeakMap<K1, InternalSetMap<K2, V>> = new WeakMap();

	/** Iterate all associated values by first key. */
	*secondValuesOf(k1: K1): Iterable<V> {
		let sub = this.map.get(k1)
		if (sub) {
			yield* sub.values()
		}
	}

	/** Get associated value list by key pair. */
	get(k1: K1, k2: K2): Set<V> | undefined {
		let sub = this.map.get(k1)
		if (!sub) {
			return undefined
		}

		return sub.get(k2)
	}

	/** Get the map consist of second keys and values from the first key. */
	getSecond(k1: K1): InternalSetMap<K2, V> | undefined {
		return this.map.get(k1)
	}

	/** Replace with first key and associated map of second keys and values. */
	setSecond(k1: K1, m: InternalSetMap<K2, V>) {
		this.map.set(k1, m)
	}

	/** Delete a key pair and associated value. */
	delete(k1: K1, k2: K2, v: V) {
		let sub = this.map.get(k1)
		if (sub) {
			sub.delete(k2, v)

			if (sub.keyCount() === 0) {
				this.map.delete(k1)
			}
		}
	}

	/** Delete associated secondary keys and values by first key. */
	deleteSecondOf(k1: K1) {
		this.map.delete(k1)
	}

	/** 
	 * Add key1, group of key2, and value.
	 * Improves a little performance compare with `add`.
	 */
	addByGroupOfSecondKeys(k1: K1, k2s: Set<K2>, v: V) {
		let sub = this.map.get(k1)
		if (!sub) {
			sub = new InternalSetMap()
			this.map.set(k1, sub)
		}

		for (let k2 of k2s) {
			sub.add(k2, v)
		}
	}
}
