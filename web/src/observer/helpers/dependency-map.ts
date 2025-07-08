import {SetMap} from '../../structs/map'
import {WeakPairKeysSetMap} from '../../structs/map-weak'


/** 
 * Caches Dependencies <=> Refresh Callbacks.
 * Can query all dependencies from a callback,
 * or query which refresh callbacks from a dependency.
 */
export class DependencyMap {

	/** Caches `Refresh Callback -> Dependency -> Dependency Key`. */
	private dependencyMap: WeakPairKeysSetMap<Function, object, PropertyKey> = new WeakPairKeysSetMap()

	/** Caches `Dependency -> Dependency Key -> Refresh Callback`. */
	private callbackMap: WeakPairKeysSetMap<object, PropertyKey, Function> = new WeakPairKeysSetMap()

	/** When doing getting property, add dependencies. */
	apply(callback: Function, deps: SetMap<object, PropertyKey>) {
		if (deps.keyCount() > 0) {
			this.updateCallbackMap(callback, deps)

			// Must after previous step.
			this.dependencyMap.setSecond(callback, deps)
			
		}
		else {
			this.dependencyMap.deleteSecondOf(callback)
		}
	}
	
	/** Update Refresh Callback Map by a Dependency Map item. */
	private updateCallbackMap(c: Function, deps: SetMap<object, PropertyKey>) {
		let oldDep = this.dependencyMap.getSecond(c)

		// Clean not existed.
		if (oldDep) {
			for (let [dep, props] of deps.entries()) {
				let oldProps = oldDep.get(dep)

				if (!oldProps) {
					continue
				}

				for (let prop of oldProps) {
					if (!props.has(prop)) {
						this.callbackMap.delete(dep, prop, c)
					}
				}
			}
		}

		// Add or replace.
		for (let [dep, props] of deps.entries()) {
			this.callbackMap.addByGroupOfSecondKeys(dep, props, c)
		}
	}

	/** Get all refresh callbacks by associated dependency and key. */
	getCallbacks(dep: object, prop: PropertyKey): Iterable<Function> | undefined {
		return this.callbackMap.get(dep, prop)
	}

	/** Get all refresh callbacks by associated dependency. */
	getAllPropCallbacks(dep: object): Iterable<Function> | undefined {
		return this.callbackMap.secondValuesOf(dep)
	}

	/** Get all dependencies by associated refresh callback. */
	getDependencies(callback: Function): SetMap<object, PropertyKey> | undefined {
		return this.dependencyMap.getSecond(callback)
	}

	/** Delete a refresh callbacks and all of its associated dependency and keys. */
	deleteCallback(callback: Function) {
		let deps = this.dependencyMap.getSecond(callback)
		if (deps) {
			for (let [dep, prop] of deps.flatEntries()) {
				this.callbackMap.delete(dep, prop, callback)
			}
		}

		this.dependencyMap.deleteSecondOf(callback)
	}
}

