import {WatchOptions} from './watch'


/** 
 * `@computed` decorates a class getter to make it compute value when required.
 * Compare with `get property() {...}`, computed property value will be cached,
 * and refresh only when required.
 * 
 * A clearing task will be enqueued after any visited dependencies get changed,
 * and to be enqueued each time after any visited dependencies get changed.
 * 
 * Note it gets updated in initialization order of all effectors / computers / watchers.
 * 
 * Decorated method can be overwritten, but should also be decorated.
 * 
 * If your computing is expensive, and don't like re-computing each time
 * after re-connected, consider using `@watch` or `@watchMulti`.
 * 
 * This is only a declaration, it will be replaced after compiled.
 */
export declare function computed(originalGetter: any, context: ClassGetterDecoratorContext): any


/** 
 * `@effect` decorates a class method, it execute this method,
 * and if any dependency it used get changed, re-execute this method.
 * 
 * The effect action will be activated after instance initialized, in declaration order,
 * and to be enqueued each time after any visited dependencies get changed.
 * 
 * Note it gets updated in initialization order of all effectors / computers / watchers.
 * 
 * If your effect method is expensive, and don't like re-computing each time
 * after re-connected, consider using `@watch` or `@watchMulti`.
 * 
 * This is only a declaration, it will be replaced after been compiled.
 */
export declare function effect(originalMethod: any, context: ClassMethodDecoratorContext): any


/** 
 * `@watch` decorates a class method to watch value of a property,
 * or returned value of a getter function,
 * and calls current method after this value changed.
 * 
 * Use it like:
 * ```
 * @watch('publicProperty', ?options)
 * onPropertyChange(propertyValue) {...}
 *
 * @watch(function(this: C) {return this.property}, ?options)
 * onPropertyChange(watchFnReturnedValue) {...}
 * ```
 * 
 * The watch action will be activated after instance initialized,
 * in declaration order, and to be called in the update queue.
 * and later be enqueued again when any visited dependencies get changed.
 * 
 * Note it gets updated in initialization order of all effectors / computers / watchers.
 * 
 * Otherwise current watch action would can't be released and GC if any dependencies still existing.
 * If you want to make sure watching things can be released, use `Watcher` APIs and release it yourself.
 * 
 * This is only a declaration, it will be replaced after been compiled.
 */
export declare function watch<T, P extends ((this: T) => any) | keyof T>(fnOrProps: P, options?: Partial<WatchOptions>):
	(originalMethod: InferMethod<T, P>, context: ClassMethodDecoratorContext<T>) => any

/** Infer watch method declaration by class T, and property or getter. */
type InferMethod<T, P extends (() => any) | keyof T>
	= (value: InferPropertyType<T, P>, oldValue: InferPropertyType<T, P> | undefined) => void

/** Infer property type by class T, and property or getter. */
type InferPropertyType<T, P extends ((() => any) | keyof T)>
	= P extends (() => any) ? ReturnType<P> : P extends keyof T ? T[P] : any



/** 
 * `@watchMulti` decorates a class method to watch several properties,
 * or returned values of a function list,
 * and calls current method after any value becomes changed.
 * 
 * Use it like:
 * ```
 * @watchMulti(['publicProperty1', 'publicProperty2'], ?options)
 * onPropertyChange([publicPropertyValue1, publicPropertyValue2], [oldPublicPropertyValue1, oldPublicPropertyValue2]) {...}
 * 
 * @watchMulti([function(this: C) {return this.property}, ...])
 * onPropertyChange([watchFnReturnedValue], [oldWatchFnReturnedValue]) {...}
 * ```
 * 
 * The watch action will be activated after instance initialized,
 * in declaration order, and to be called in the update queue.
 * and later be enqueued again when any visited dependencies get changed.
 * 
 * Otherwise current watch action would can't be released and GC if any dependencies still existing.
 * If you want to make sure watching things can be released, use `Watcher` apis and release it yourself.
 * 
 * This is only a declaration, it will be replaced after been compiled.
 */
export declare function watchMulti<T, PS extends (((this: T) => any) | keyof T)[]>(fnOrProps: PS, options?: Partial<WatchOptions>):
	(originalMethod: InferMultiMethod<T, PS>, context: ClassMethodDecoratorContext<T>) => any

/** Infer watch multi method declaration by class T, and list of property or getter. */
type InferMultiMethod<T, PS extends ((() => any) | keyof T)[]>
	= (values: InferMultiMethodParameters<T, PS>, oldValues: InferMultiMethodParameters<T, PS> | undefined) => void

/** Infer watch multi method parameters by class T, and list of property or getter. */
type InferMultiMethodParameters<T, PS extends ((() => any) | keyof T)[]>
	= {[K in keyof PS]: InferPropertyType<T, PS[K]>}


/** 
 * Can connect and disconnect, so life-cycle callbacks of
 * `@computed`, `@effect`, `@watch`, `@watchMulti` can be compiled
 * and injected into `onConnected` and `onWillDisconnect` methods.
 */
export interface Connectable {

	/** 
	 * After created.
	 * Provide it for overwriting before calling super.
	 */
	onCreated(): void

	/** Will re-connect all dependencies after connected. */
	onConnected(): void

	/** Will disconnect all dependencies before will disconnect. */
	onWillDisconnect() : void
}