import {InternalSetMap} from '../structs/map'
import {bindCallback} from '../utils'
import {DependencyMap} from './helpers/dependency-map'


// This file was exported as `DependencyTracker` before,
// but it's apis are used frequently by Lupos Compiler,
// so finally it export all members directly.


/** Caches `Dependency <=> Callback`. */
const DepMap: DependencyMap = /*#__PURE__*/new DependencyMap()

/** Mark the latest version of objects which are tracking elements. */
const ElementsDepVersionMap: WeakMap<object, number> = /*#__PURE__*/new WeakMap()

/** Tracker stack list. */
const trackerStack: DependencyTracker[] = []

/** Current callback and dependencies that is doing capturing. */
let currentTracker: DependencyTracker | null = null


/** 
 * Begin to capture dependencies.
 * `callback` will be called when any dependency get changed.
 * Would suggest executing the following codes in a `try{...}` statement.
 * 
 * You must ensure to end each begun capturing, or fatal error will happen.
 * You may use returned tracker object to do snapshot comparing.
 */
export function beginTrack(callback: Function, scope: object | null = null): DependencyTracker {
	let boundCallback = bindCallback(callback, scope)

	if (currentTracker) {
		trackerStack.push(currentTracker)
	}

	return currentTracker = new DependencyTracker(boundCallback)
}


/** 
 * End capturing dependencies.
 * You must ensure to end each begun capturing, or fatal error will happen.
 */
export function endTrack() {
	currentTracker!.apply()
	debug(currentTracker!)

	if (trackerStack.length > 0) {
		currentTracker = trackerStack.pop()!
	}
	else {
		currentTracker = null
	}
}


/** This debug function will be eliminated in production mode. */
function debug(currentTracker: DependencyTracker) {
	if (currentTracker!.dependencies.keyCount() > 500) {
		console.warn(`Too many dependencies (${currentTracker!.dependencies.keyCount()}) captured, try reduce some.`)
		console.log(currentTracker!.dependencies)
	}
}


/** 
 * When doing property getting, add a dependency.
 * Normally you have no need to call this, compiler will insert statements calls `trackGet` automatically.
 * Note if one property is not empty string, you must ensure it's the key of `obj`.
 */
export function trackGet(obj: object, ...properties: PropertyKey[]) {
	if (!currentTracker) {
		return
	}

	currentTracker.dependencies.addSeveral(obj, properties)
}


/** 
 * When need to track all properties and descendant properties recursively
 * of an object as dependencies, e.g., when uses `JSON.stringify(...)`.
 * Note that compiler will not generate statements to call this, you must call it manually.
 */
export function trackGetDeeply(obj: object, maxDepth = 10) {
	if (!currentTracker) {
		return
	}

	if (maxDepth === 0) {
		return
	}

	// Array.
	if (Array.isArray(obj)) {
		trackGet(obj, '')

		for (let item of obj) {
			if (item && typeof item === 'object') {
				trackGetDeeply(item, maxDepth - 1)
			}
		}
	}

	// Plain object.
	else {
		trackGet(obj, '')
		
		for (let key of Object.keys(obj)) {
			let item = (obj as any)[key]
			if (item && typeof item === 'object') {
				trackGetDeeply(item, maxDepth - 1)
			}
		}
	}
}


/** 
 * When doing setting property, notify the dependency is changed.
 * Normally you have no need to call this, compiler will insert statements calls `trackSet` automatically.
 * Note if one property is not empty string, you must ensure it's the existing key of `obj`.
 */
export function trackSet(obj: object, ...properties: PropertyKey[]) {
	for (let prop of properties) {
		if (prop === '') {
			let callbacks = DepMap.getAllPropCallbacks(obj)
			if (callbacks) {
				for (let callback of callbacks) {
					callback()
				}
			}
		}
		else {
			let callbacks = DepMap.getCallbacks(obj, prop)
			if (callbacks) {
				for (let callback of callbacks) {
					callback()
				}
			}
		}	
	}

	// Should also calls elements callbacks, low frequency.
	if (!properties.includes('')) {
		let elementsCallbacks = DepMap.getCallbacks(obj, '')
		if (elementsCallbacks) {
			for (let callback of elementsCallbacks) {
				callback()
			}
		}
	}

	// Upgrade elements dependency version if it exists, for snapshot comparing.
	let version = ElementsDepVersionMap.get(obj)
	if (version !== undefined) {
		ElementsDepVersionMap.set(obj, version + 1)
	}
}


/** Remove all dependencies of a refresh callback. */
export function untrack(callback: Function, scope: object | null = null) {
	let boundCallback = bindCallback(callback, scope)
	DepMap.deleteCallback(boundCallback)
}


/** 
 * Contains captured dependencies, and the refresh callbacks,
 * which it need to call after any dependency get changed.
 * 
 * Can also use it to generate a dependency values snapshot,
 * you may compare it later to test whether any dependency has changed.
 */
export class DependencyTracker {

	/** Refresh callback, to call it after any dependency changed. */
	readonly callback: Function

	/** Each object and accessed property. */
	readonly dependencies: InternalSetMap<object, PropertyKey> = new InternalSetMap()

	/** Whether in tracking. */
	tracking: boolean = false

	constructor(callback: Function) {
		this.callback = callback
	}

	/** Apply or restore current tracking to global tracking. */
	apply() {
		DepMap.apply(this.callback, this.dependencies)
		this.tracking = true
	}

	/** Remove current tracking from global tracking.  */
	remove() {
		DepMap.deleteCallback(this.callback)
		this.tracking = false
	}

	/** 
	 * Compute current dependency values as a snapshot for comparing them later.
	 * Remember don't use this too frequently,
	 * it will get values by dynamic properties and affect performance.
	 */
	makeSnapshot(): any[] {
		let values: any[] = []

		for (let [dep, prop] of this.dependencies.flatEntries()) {
			if (prop === '') {
				let version = ElementsDepVersionMap.get(dep)
				if (version === undefined) {
					ElementsDepVersionMap.set(dep, version = 0)
				}
				values.push(version)
			}
			else {
				values.push((dep as any)[prop])
			}
		}

		return values
	}

	/** Compare whether dependency values have changed from a previously computed snapshot. */
	compareSnapshot(oldValues: any[]): boolean {
		let index = 0

		// Important notes:
		// We assume each value in old values are always
		// have the same position with new values.
		// This is because haven't doing new tracking.

		for (let [dep, prop] of this.dependencies.flatEntries()) {
			let oldValue = oldValues[index]
			if (prop === '') {
				let newVersion = ElementsDepVersionMap.get(dep)
				if (newVersion !== oldValue) {
					return true
				}
			}
			else {
				let newValue = (dep as any)[prop]
				if (newValue !== oldValue) {
					return true
				}
			}

			index++
		}

		return false
	}
}
