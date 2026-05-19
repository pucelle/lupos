import {InternalWeakPairKeysMap} from '../structs/map-weak'


/** Caches all bound callbacks, `Callback -> Scope -> Bound Callback`. */
const BoundCallbackMap: InternalWeakPairKeysMap<Function, object, Function> = /*#__PURE__*/new InternalWeakPairKeysMap()


/** 
 * Bind a callback and a scope to get a new callback function.
 * Will cache result and always get same result for same parameters.
 */
export function bindCallback<T extends Function>(callback: T, scope: object | null): T {
	if (!scope) {
		return callback
	}

	let boundCallback = BoundCallbackMap.get(callback, scope) as T | undefined			
	if (!boundCallback) {
		boundCallback = callback.bind(scope) as T
		BoundCallbackMap.set(callback, scope, boundCallback)
	}

	return boundCallback
}
