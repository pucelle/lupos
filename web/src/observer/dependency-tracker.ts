import {InternalPairKeysCounter, InternalSetMap} from '../structs/map'
import {DependencyMap} from './dependency-map'
import {Updatable} from '../types'


/** Caches `Dependency <=> Updatable`. */
const DepMap: DependencyMap = /*#__PURE__*/new DependencyMap()

/** Mark the latest version of objects which are tracking elements. */
const ElementsDepVersionMap: WeakMap<object, number> = /*#__PURE__*/new WeakMap()

/** Tracker stack list. */
const trackerStack: DependencyTracker[] = []

/** Current updatable and dependencies that is doing capturing. */
let currentTracker: DependencyTracker | null = null


/** 
 * Begin to capture dependencies.
 * `updatable.willUpdate` will be called when any dependency get changed.
 * Would suggest executing the following codes in a `try{...}` statement.
 * 
 * You must ensure to end each begun capturing, or fatal error will happen.
 * You may use returned tracker object to do snapshot comparing.
 */
export function beginTrack(updatable: Updatable): DependencyTracker {
	if (currentTracker) {
		trackerStack.push(currentTracker)
	}

	return currentTracker = new DependencyTracker(updatable)
}


/** 
 * End capturing dependencies.
 * You must ensure to end each begun capturing, or fatal error will happen.
 */
export function endTrack() {
	currentTracker!.apply()
	debug_tracker_end(currentTracker!)

	if (trackerStack.length > 0) {
		currentTracker = trackerStack.pop()!
	}
	else {
		currentTracker = null
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
	debug_tracking_set(obj, properties)

	for (let prop of properties) {
		if (prop === '') {
			let updatableList = DepMap.getAllUpdatable(obj)
			if (updatableList) {
				for (let updatable of updatableList) {
					updatable.willUpdate()
				}
			}
		}
		else {
			let updatableList = DepMap.getUpdatable(obj, prop)
			if (updatableList) {
				for (let updatable of updatableList) {
					updatable.willUpdate()
				}
			}
		}	
	}

	// Should also calls elements updatable, low frequency.
	if (!properties.includes('')) {
		let elementsUpdatableList = DepMap.getUpdatable(obj, '')
		if (elementsUpdatableList) {
			for (let updatable of elementsUpdatableList) {
				updatable.willUpdate()
			}
		}
	}

	// Upgrade elements dependency version if it exists, for snapshot comparing.
	let version = ElementsDepVersionMap.get(obj)
	if (version !== undefined) {
		ElementsDepVersionMap.set(obj, version + 1)
	}
}


/** Remove all dependencies of a updatable. */
export function untrack(updatable: Updatable) {
	DepMap.deleteUpdatable(updatable)
}



/** 
 * Contains captured dependencies, and the updatable,
 * which it need to call after any dependency get changed.
 * 
 * Can also use it to generate a dependency values snapshot,
 * you may compare it later to test whether any dependency has changed.
 */
export class DependencyTracker {

	/** updatable, to call it's `willUpdate` after any dependency changed. */
	readonly updatable: Updatable

	/** Each object and accessed property. */
	readonly dependencies: InternalSetMap<object, PropertyKey> = new InternalSetMap()

	/** Whether in tracking. */
	tracking: boolean = false

	constructor(updatable: Updatable) {
		this.updatable = updatable
	}

	/** Apply or restore current tracking to global tracking. */
	apply() {
		DepMap.apply(this.updatable, this.dependencies)
		this.tracking = true
	}

	/** Remove current tracking from global tracking.  */
	remove() {
		DepMap.deleteUpdatable(this.updatable)
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


/** Get clear after queue update loop completed. */
const update_loop_tracking_get_cache: InternalSetMap<object, PropertyKey> = /*#__PURE__*/new InternalSetMap()

/** Get clear after one second. */
let one_second_tracking_counter: InternalPairKeysCounter<object, PropertyKey> = /*#__PURE__*/new InternalPairKeysCounter()
let one_second_tracking_timeout: number | null = null

/** This `debug_xxx` functions should be eliminated in production mode. */
function debug_tracker_end(tracker: DependencyTracker) {
	debug_tracking_count(tracker)

	// Remember all get trackings in current update loop.
	for (let [obj, props] of tracker.dependencies.entries()) {
		update_loop_tracking_get_cache.addSeveral(obj, props)
	}
}

/** This `debug_xxx` functions should be eliminated in production mode. */
function debug_tracking_count(tracker: DependencyTracker) {
	if (tracker.dependencies.keyCount() > 500) {
		console.warn(`Too many dependencies (${tracker.dependencies.keyCount()}) captured, try reduce some.`, tracker.dependencies)
	}
}

/** 
 * Call it to debug after each time set completed.
 * This `debug_xxx` functions should be eliminated in production mode.
 */
function debug_tracking_set(obj: object, properties: PropertyKey[]) {
	debug_circular_tracking(obj, properties)
	debug_infinite_tracking(obj, properties)

	if (!one_second_tracking_timeout) {
		one_second_tracking_timeout = setTimeout(() => {
			for (let [obj, prop, count] of one_second_tracking_counter.flatEntries()) {
				if (count > 10) {
					console.warn('May getting and setting infinitely', obj, prop)
				}
			}

			one_second_tracking_counter.clear()
			one_second_tracking_timeout = null
		}, 1000)
	}
}

/** 
 * This `debug_xxx` functions should be eliminated in production mode.
 * 
 * To debug like:
 * `
 *   get property
 *   ...
 *   set same property
 * `
 */
function debug_circular_tracking(obj: object, properties: PropertyKey[]) {
	if (!currentTracker) {
		return
	}

	for (let prop of properties) {
		if (prop === '') {
			if (currentTracker.dependencies.hasKey(obj)) {
				console.warn('Getting and setting same property in one tracking loop', obj, prop)
			}
		}
		else {
			if (currentTracker.dependencies.has(obj, prop)) {
				console.warn('Getting and setting same property in one tracking loop', obj, prop)
			}
		}	
	}

	// Should also calls elements updatable, low frequency.
	if (!properties.includes('')) {
		if (currentTracker.dependencies.has(obj, '')) {
			console.warn('Getting and setting same property in one tracking loop', obj)
		}
	}
}

/** 
 * Call it to debug after each time update completed.
 * This `debug_xxx` functions should be eliminated in production mode.
 * 
 * To debug like:
 * `
 *   get property
 *   await ...
 *   set same property
 * `
 */
function debug_infinite_tracking(obj: object, properties: PropertyKey[]) {
	for (let prop of properties) {
		if (prop === '') {
			if (update_loop_tracking_get_cache.hasKey(obj)) {
				one_second_tracking_counter.add(obj, prop)
			}
		}
		else {
			if (update_loop_tracking_get_cache.has(obj, prop)) {
				one_second_tracking_counter.add(obj, prop)
			}
		}	
	}

	// Should also calls elements updatable, low frequency.
	if (!properties.includes('')) {
		if (update_loop_tracking_get_cache.has(obj, '')) {
			one_second_tracking_counter.add(obj, '')
		}
	}
}
