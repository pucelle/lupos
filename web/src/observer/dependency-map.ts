import {InternalSetMap} from '../structs/map'
import {InternalWeakPairKeysSetMap} from '../structs/map-weak'
import {Updatable} from '../types'


/** 
 * Caches Dependencies <=> Updatable.
 * Can query all dependencies from a Updatable,
 * or query which Updatable from a dependency.
 */
export class DependencyMap {

	/** Caches `Updatable -> Dependency -> Dependency Key`. */
	private dependencyMap: InternalWeakPairKeysSetMap<Updatable, object, PropertyKey> = new InternalWeakPairKeysSetMap()

	/** Caches `Dependency -> Dependency Key -> Updatable`. */
	private updatableMap: InternalWeakPairKeysSetMap<object, PropertyKey, Updatable> = new InternalWeakPairKeysSetMap()

	/** When doing getting property, add dependencies. */
	apply(updatable: Updatable, deps: InternalSetMap<object, PropertyKey>) {
		if (deps.keyCount() > 0) {
			this.updateUpdatableMap(updatable, deps)

			// Must after previous step.
			this.dependencyMap.setSecond(updatable, deps)
		}
		else {
			this.dependencyMap.deleteSecondOf(updatable)
		}
	}
	
	/** Update Updatable Map by a Dependency Map item. */
	private updateUpdatableMap(u: Updatable, newDeps: InternalSetMap<object, PropertyKey>) {
		let oldDep = this.dependencyMap.getSecond(u)

		// Clean not existed.
		if (oldDep) {
			for (let [dep, oldProps] of oldDep.entries()) {
				let newProps = newDeps.get(dep)

				for (let oldProp of oldProps) {
					if (!newProps?.has(oldProp)) {
						this.updatableMap.delete(dep, oldProp, u)
					}
				}
			}
		}

		// Add or replace.
		for (let [dep, props] of newDeps.entries()) {
			this.updatableMap.addByGroupOfSecondKeys(dep, props, u)
		}
	}

	/** Get all Updatable by associated dependency and key. */
	getUpdatable(dep: object, prop: PropertyKey): Iterable<Updatable> | undefined {
		return this.updatableMap.get(dep, prop)
	}

	/** Get all Updatable by associated dependency. */
	getAllUpdatable(dep: object): Iterable<Updatable> | undefined {
		return this.updatableMap.secondValuesOf(dep)
	}

	/** Get all dependencies by associated Updatable. */
	getDependencies(updatable: Updatable): InternalSetMap<object, PropertyKey> | undefined {
		return this.dependencyMap.getSecond(updatable)
	}

	/** Delete a Updatable and all of its associated dependency and keys. */
	deleteUpdatable(updatable: Updatable) {
		let deps = this.dependencyMap.getSecond(updatable)
		if (deps) {
			for (let [dep, prop] of deps.flatEntries()) {
				this.updatableMap.delete(dep, prop, updatable)
			}
		}

		this.dependencyMap.deleteSecondOf(updatable)
	}
}

