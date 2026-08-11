import {trackGet, trackSet} from './dependency-tracker'


type ProxyOf<T> = T extends object ? T & {ProxySymbol: T} : T


/** To find the proxy of an object. */
const ProxyMap: WeakMap<object | ProxyOf<any>, ProxyOf<any>> = /*#__PURE__*/new WeakMap()

/** To recover the original object from one of our proxies. */
const ProxySourceMap: WeakMap<object, object> = /*#__PURE__*/new WeakMap()


/** 
 * Proxy an object or an array, map or set (not weak map or weak set), 
 * and all the descendant properties as dependencies, returns the proxy of this object.
 * 
 * It's the final way of observing when other ways fail.
 * 
 * Multiple times of proxy a same object will always return the same output.
 * Otherwise note after tracked, properties accessing is 50x slower. So, avoid use it often.
 * 
 * Normally the compile-time dependency-tracking would be enough to track the change of observable object,
 * but if you meet these scenarios, you may need `proxyOf`:
 *   1. You want to track all the properties of an object.
 *   2. You want to track deep descendant properties of an object.
 */
export function proxyOf<T extends object>(v: T): ProxyOf<T> {
	if (!v || typeof v !== 'object') {
		return v as ProxyOf<T>
	}

	return proxyObject(v)
}


/** Proxy an object. */
function proxyObject<T extends object>(o: T | ProxyOf<T>): ProxyOf<T> {

	// May become a proxy of object already.
	let proxy = ProxyMap.get(o)
	if (proxy) {
		return proxy
	}

	if (Array.isArray(o)) {
		proxy = proxyArray(o)
	}
	else {
		let string = o.toString()
		if (string === '[object Map]') {
			proxy = proxyMap(o as Map<any, any>)
		}
		else if (string === '[object Set]') {
			proxy = proxySet(o as Set<any>)
		}
		else {
			proxy = proxyPlainObject(o)
		}
	}

	ProxyMap.set(o, proxy)
	ProxyMap.set(proxy, proxy)
	ProxySourceMap.set(proxy, o)

	return proxy
}


/** Proxy an plain object. */
function proxyPlainObject<T extends object>(o: T): ProxyOf<T> {
	return new Proxy(o, PlainObjectProxyHandler)
}


/** Proxy an array. */
function proxyArray<T extends any[]>(a: T): ProxyOf<T> {
	return new Proxy(a, ArrayProxyHandler)
}


/** Proxy a map. */
function proxyMap<T extends Map<any, any>>(a: T): ProxyOf<T> {
	return new Proxy(a, MapProxyHandler)
}


/** Proxy a set. */
function proxySet<T extends Set<any>>(a: T): ProxyOf<T> {
	return new Proxy(a, SetProxyHandler)
}


/** For observing plain object. */
const PlainObjectProxyHandler = {

	get(o: any, key: PropertyKey): ProxyOf<any> {
		trackGet(o, key)
		return proxyOf(o[key])
	},

	set(o: any, key: PropertyKey, toValue: any): true {
		let fromValue = o[key]
		o[key] = toValue

		if (fromValue !== toValue) {
			trackSet(o, key)
		}

		return true
	},

	deleteProperty(o: any, key: PropertyKey): boolean {
		let hadKey = Object.prototype.hasOwnProperty.call(o, key)
		let result = delete o[key]
		if (result && hadKey) {
			trackSet(o, key)
		}

		return result
	},
}


/** For array proxy. */
const ArrayProxyHandler = {

	get(a: any, key: PropertyKey): ProxyOf<any> {
		let value = a[key]
		let type = typeof value

		// Proxy returned element in array.
		if (typeof key === 'string' && /^\d+$/.test(key)) {
			trackGet(a, key)
			return proxyOf(value)
		}

		// Proxy array methods.
		else if (type === 'function') {
			let proxyMethod = ArrayProxyMethods[key]
			return proxyMethod ? proxyMethod.bind(a) : value
		}

		// Other properties, like `length`.
		else {
			trackGet(a, '')
			return value
		}
	},

	set(a: any, key: PropertyKey, toValue: any): true {
		let fromValue = a[key]
		a[key] = toValue

		if (fromValue !== toValue) {
			trackSet(a, '')
		}

		return true
	},

	deleteProperty(a: any, key: PropertyKey): boolean {
		let hadKey = Object.prototype.hasOwnProperty.call(a, key)
		let result = delete a[key]
		if (result && hadKey) {
			trackSet(a, '')
		}

		return result
	},
}


/** Overwrite array methods. */
const ArrayProxyMethods: any = {

	push(this: any[], ...values: any[]) {
		let result = Array.prototype.push.call(this, ...values)

		if (values.length > 0) {
			trackSet(this, '')
		}

		return result
	},

	unshift(this: any[], ...values: any[]) {
		let result = Array.prototype.unshift.call(this, ...values)

		if (values.length > 0) {
			trackSet(this, '')
		}

		return result
	},

	pop(this: any[]) {
		let count = this.length
		let result = Array.prototype.pop.call(this)

		if (count > 0) {
			trackSet(this, '')
		}

		return proxyOf(result)
	},

	shift(this: any[]) {
		let count = this.length
		let result = Array.prototype.shift.call(this)

		if (count > 0) {
			trackSet(this, '')
		}

		return proxyOf(result)
	},

	splice(this: any[], ...args: any[]) {
		let result = Array.prototype.splice.apply(this, args as [number, number, ...any[]])

		if (result.length > 0 || args.length > 2) {
			trackSet(this, '')
		}

		return proxyOf(result)
	},

	reverse(this: any[]) {
		Array.prototype.reverse.call(this)
		trackSet(this, '')
		
		return ProxyMap.get(this)!
	},
}



/** For map proxy. */
const MapProxyHandler = {

	get(a: any, key: PropertyKey): ProxyOf<any> {
		if (key === 'size') {
			trackGet(a, '')
			return a.size
		}

		if (key === 'get') {
			return ((mapKey: any) => {
				trackGet(a, '')
				return proxyOf(a.get(unwrapProxy(mapKey)))
			}) as any
		}

		if (key === 'has') {
			return ((mapKey: any) => {
				trackGet(a, '')
				return a.has(unwrapProxy(mapKey))
			}) as any
		}

		if (key === 'set') {
			return ((mapKey: any, value: any) => {
				mapKey = unwrapProxy(mapKey)
				value = unwrapProxy(value)
				let changed = !a.has(mapKey) || a.get(mapKey) !== value
				a.set(mapKey, value)
				if (changed) {
					trackSet(a, '')
				}
				return ProxyMap.get(a)
			}) as any
		}

		if (key === 'delete') {
			return ((mapKey: any) => {
				let deleted = a.delete(unwrapProxy(mapKey))
				if (deleted) {
					trackSet(a, '')
				}
				return deleted
			}) as any
		}

		if (key === 'clear') {
			return (() => {
				if (a.size > 0) {
					a.clear()
					trackSet(a, '')
				}
			}) as any
		}

		let value = a[key]
		if (typeof value === 'function') {
			trackGet(a, '')
		}
		return typeof value === 'function' ? value.bind(a) : value
	},
}


/** For set proxy. */
const SetProxyHandler = {

	get(a: any, key: PropertyKey): ProxyOf<any> {
		if (key === 'size') {
			trackGet(a, '')
			return a.size
		}

		if (key === 'has') {
			return ((value: any) => {
				trackGet(a, '')
				return a.has(unwrapProxy(value))
			}) as any
		}

		if (key === 'add') {
			return ((value: any) => {
				value = unwrapProxy(value)
				let changed = !a.has(value)
				a.add(value)
				if (changed) {
					trackSet(a, '')
				}
				return ProxyMap.get(a)
			}) as any
		}

		if (key === 'delete') {
			return ((value: any) => {
				let deleted = a.delete(unwrapProxy(value))
				if (deleted) {
					trackSet(a, '')
				}
				return deleted
			}) as any
		}
		
		if (key === 'clear') {
			return (() => {
				if (a.size > 0) {
					a.clear()
					trackSet(a, '')
				}
			}) as any
		}

		let value = a[key]
		if (typeof value === 'function') {
			trackGet(a, '')
		}
		return typeof value === 'function' ? value.bind(a) : value
	},
}


/** Get the original value when `value` is one of our proxies. */
function unwrapProxy<T>(value: T): T {
	if (value && typeof value === 'object') {
		return (ProxySourceMap.get(value) ?? value) as T
	}

	return value
}
