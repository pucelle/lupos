# lupos

**lupos** is a module and a compiler to support component-based programming in typescript.

Currently it serves project [lupos.js](https://github.com/pucelle/lupos.js), and will serve [lupos.paint](https://github.com/pucelle/lupos.paint) in the future.


**lupos** includes two parts:

- `cli` provides command which uses internal Typescript Transformer to compile **lupos** based projects.
- `web` is the runtime that needs to be imported from your projects.


## Features

### 1. Data change tracking

If an object should be observed, **lupos** will track get and set actions of it's properties and even descendant properties and then add statements besides like `trackGet` and `trackSet`.


#### Become Observed

Here are the rules to decide whether an object should be observed:

- `class XXX implements Observed {...}`: class child properties and descendant properties become observed, also affect derived classes.
- `(variable as Observed<...>)`: variable becomes observed if it's **as** `Observed`.
- `interface T extends Observed{...}; let variable = T`: if an interface extends Observed, which's type resolved to type `T` becomes observed.
- `<T extends Observed<...>>`: which's type resolved as type parameter `T` becomes observed.
- `class {property: Observed<...>}`: property becomes observed if it's type is `Observed`.
- `let variable: Observed<...> = ...`: declared variable becomes observed if it's type is declared as `Observed`.
- `let variable = xxx as Observed<...>`: declared variable becomes observed if it's initializer is declared as `Observed`.


#### Observed Broadcasting

Normally observed state of an object will broadcast to it's child properties, except:

- `readonly property`: readonly property get or set action is not tracked, but still broadcast observed state to property value.
- `UnObserved<...>`: which's resolved type is `UnObserved` become not observed.
- `$variable / $property / $parameter`: which's name starts with `$` become not observed.
- `list.map(item => ...)`: if `list` is observed, broadcast to `item`.


#### Other APIs

- Check `trackGetDeeply` and `proxyOf` apis below.


#### Examples

ts```
class Example implements Observed {
	value: number = 0
	get(): number {
		return this.value
	}
	set(value: number) {
		this.value = value
	}
}
```

After compiled:

js```
class Example {
	value = 0
	get(): {
		trackGet(this, 'value')
		return this.value
	}
	set(value:) {
		trackSet(this, 'value')
		this.value = value
	}
}
```



### 2. Template compiling

- compile `html`, `svg` and `paint` template to vanilla codes, and hoist partial codes to optimize.
- compile `css` template to compress it.



## APIs

### 1. cli APIs

- `luc`: compile lupos based project by typescript and transformer.
- `luc -e`: compile to esm codes, import paths will be resolved to file path, so outputted codes can do tree shaking easier.
- `luc -w`: compile in watch mode.


### 2. web APIs

- **Component**:
	- `@setContext`: decorates a component property to declare a context variable. Target component must extend `ContextVariableConstructor`.
	- `@useContext`: decorates a component property to reference a context variable defined in any ancestral component. Target component must extend `ContextVariableConstructor`.

- **Events**:
	- `DOMEvents`: bind document events, especially when scope needs to bind.
	- `DomModifiableEvents`: bind document events with modifiers, like `prevent`, `stop`, `Enter`...
	- `EventFirer`: help to bind and fire event.
	- `EventKeys`: help to get event key and code of an key events.

- **Observer**:
	- **Decorators**:
		- `@computed`: decorates a class getter to make it compute value when required, and refresh result when required.
		- `@effect`: decorates a class method, it execute this method, and if any dependency it used get changed, re-execute.
		- `@watch(publicProperty / getterFn)`: decorates a class method to watch value of a property or returned value of a getter function, and calls current method after this value changed.
		- `@watchMulti(...)`: same as `@watch`, except it watches several properties or getter functions.

	- **Tracking functions**:
		- `beginTrack(callback)`: begin to capture dependencies. refresh `callback` get called when any dependencies get changed.
		- `endTrack`: end capturing dependencies.
		- `untrack(callback)`: remove all dependencies of a refresh callback.
		- `trackExecution(fn)`: execute `fn`, and captures all dependencies during execution.
		- `trackGet`: when doing property getting, add a dependency.
		- `trackSet`: when doing setting property, notify the dependency is changed.
		- `trackGetDeeply`: when need to track all properties and descendant properties of an object recursively of an object as dependency. Like `JSON.stringify(...)`.
		- `proxyOf`: proxy an object or an array, map or set (not weak map or weak set), and all the descendant properties of them. It's the final way of observing when other ways fail.

	- **Queue**
		- `enqueueUpdate`: enqueue a callback with a scope, will call it before the next animate frame.
		- `enqueueAfterDataApplied`: enqueue a callback with a scope, will call it before all watchers / effectors / computers to be called, and after all components update callbacks.
		- `untilUpdateComplete`: returns a promise which will be resolved after all the enqueued callbacks were called.
		- `untilFirstPaintCompleted`: Returns a promise, which will be resolved after the first time update complete, and browser paint completed.

	- **Utils**
		- `AnimationFrame`: request to call `callback` in current or before next animation frame.
		- `bindCallback`: bind callback with scope.
		- `promiseWithResolves`: returns a promise, with it's resolve and reject.



## License

MIT