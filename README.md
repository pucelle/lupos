<h1 align="left">
    <img src="https://github.com/pucelle/lupos/blob/master/images/logo.png?raw=true" width="32" height="32" alt="Lupos Logo" />
    Lupos
</h1>


**lupos** is a framework to support component-based programming in TypeScript.

It was designed to solve two problems in web programming, which are hard to solve by experience or programming design:

- Observing data changes - by TypeScript AOT analysis
- Efficiently update after data changes - by pre-compiling template literal

Currently it serves project [lupos.html](https://github.com/pucelle/lupos.html), and will serve [lupos.paint](https://github.com/pucelle/lupos.paint) later.

[lupos-vscode](https://github.com/pucelle/lupos-vscode) is the vscode plugin provides Syntax Highlighting and IntelliSense for **lupos**.



**lupos** includes two parts:

- `cli` provides command line which uses internal TypeScript Transformer to compile **lupos** based projects.
- `web` is the runtime that needs to be imported from your projects.



## Features

### 1. Property Get and Set Tracking

If an object should be observed, **lupos** will track get and set actions of it's properties and even descendant properties, then inject statements besides like `trackGet` and `trackSet`.

Compare with some modern tracking ways like **Proxy**, **Signal**, **State**..., **lupos** is:

- No need to design or even pay attention to data tracking, it naturally works after declared type as **Observed**.
- Much more efficient, additionally lupos will merge tracking statements and hoist them when possible to improve performance.
- Can easily debug data tracking by compiled statements.


#### Become Observed

Here are the rules to decide whether an object should be observed:

- `class XXX implements Observed {...}`: class child properties and descendant properties become observed, also affect derived classes.
- `(variable as Observed<...>)`: variable becomes observed if it's **as** `Observed`.
- `interface T extends Observed{...}; let variable = T`: if an interface extends Observed, which's type resolved to type `T` becomes observed.
- `<T extends Observed<...>>`: which's type resolved as type parameter `T` becomes observed.
- `class {property: Observed<...>}`: property becomes observed if it's type is `Observed`.
- `let variable: Observed<...> = ...`: declared variable becomes observed if it's type is declared as `Observed`.
- `let variable = xxx as Observed<...>`: declared variable becomes observed if it's initializer is declared as `Observed`.



#### Observed State Broadcasting

Normally observed state of an object will broadcast to it's properties:

- `readonly property`: readonly property get or set action is not tracked, but still broadcast observed state to property value.
- `list.map(item => ...)`: if `list` is observed, broadcast to `item`.
- Shallow array copies such as `list.filter(...)` and `list.slice(...)` are not themselves observed, but retain the observed state of their source elements.
- `UnObserved<...>`: which's resolved type is `UnObserved` become not observed.
- `$variable / $property / $parameter`: which's name starts with `$` become not observed.



#### Example about how lupos compiling

```ts
class Example implements Observed {
	value: number = 0;
	getValue(): number {
		return this.value;
	}
	setValue(value: number) {
		this.value = value;
	}
}
```

After compiled:

```js
class Example {
	value = 0;
	getValue() {
		trackGet(this, 'value');
		return this.value;
	}
	setValue(value) {
		trackSet(this, 'value');
		this.value = value;
	}
}
```


### 2. Template compiling

- compile `html` and `svg` template of [lupos.html](https://github.com/pucelle/lupos.html), and `paint` template of [lupos.paint](https://github.com/pucelle/lupos.paint) to vanilla codes, and hoist codes to optimize.
- compile `css` template of [lupos.html](https://github.com/pucelle/lupos.html) to compress it.



## APIs

### 1. cli APIs

- `luc`: compile lupos based project by typescript and transformer.
- `-e`: equals `--esm`, compile to esm codes, import paths will be resolved to file path, so outputted codes can do tree shaking easier.
- `-s`: equals `--svg-embedded`, embed svg imports to string, compress and replace color `#000000` to `currentColor`.
- `-w`: equals `--watch`, compile in watch mode.


### 2. web APIs

- **Component**:
	- `@setContext`: decorates a component property to declare a context variable. Target component must extend `ContextVariableConstructor`.
	- `@useContext`: decorates a component property to reference a context variable defined in any ancestral component. Target component must extend `ContextVariableConstructor`.

- **Events**:
	- `DOMEvents`: bind and unbind DOM events with optional scopes, listener options, and one-time listeners.
	- `DOMModifiableEvents`: bind DOM events with modifiers such as `prevent`, `stop`, `once`, `self`, keyboard shortcuts, mouse buttons, checkbox states, and wheel directions.
	- `EventFirer`: register, remove, and fire typed application events.
	- `EventKeys`: inspect keyboard events and normalize key, code, and shortcut names.

- **Observer**:
	- **Decorators**: note these decorators get updated in their declaration order.
		- `@computed`: decorates a class getter to make it compute value when required, and refresh result when required.
		- `@asyncComputed(getter, continuous?)`: decorates a class property whose value is produced by a synchronous or asynchronous getter and refreshed when its dependencies change.
		- `@effect`: decorates a class method, it execute this method, and if any dependency it used get changed, re-execute.
		- `@watch(publicProperty / getterFn)`: decorates a class method to watch value of a property or returned value of a getter function, and calls current method after this value changed.
		- `@watchMulti(...)`: same as `@watch`, except it watches several properties or getter functions.

	- **Observer classes**:
		- `Computed`: lazily compute and cache a synchronous value while tracking its dependencies.
		- `AsyncComputed`: compute an asynchronous value and refresh it when its dependencies change.
		- `Effector`: run an effect and re-run it after a tracked dependency changes.
		- `Watcher`: watch one derived value and call a callback when it changes.
		- `MultiWatcher`: watch several derived values together.

	- **Tracking functions**:
		- `beginTrack(updatable)`: begin capturing dependencies for an `Updatable` object. Its `willUpdate` method is called after a captured dependency changes.
		- `endTrack(meetsError?)`: finish the current capture. Pass `true` to discard dependencies captured by a failed operation.
		- `untrack(updatable)`: remove every dependency associated with an `Updatable` object.
		- `trackGet(object, ...properties)`: add object properties to the current dependency capture.
		- `trackSet(object, ...properties)`: notify observers that object properties changed.
		- `trackGetDeeply(object, maxDepth?)`: recursively track an object's properties and descendants, for operations such as `JSON.stringify`.
		- `proxyOf(value)`: observe an object, array, `Map`, or `Set` at runtime. Object and array descendants, plus values returned by `Map.get`, are proxied lazily. Collection reads and iteration are tracked, and actual mutations notify observers. `WeakMap` and `WeakSet` are not supported.

	- **Queue**:
		- `UpdateQueue.enqueue(updatable)`: enqueue an `Updatable`; queued items run in ascending `iid` order before the next animation frame.
		- `UpdateQueue.hasEnqueued(updatable)`: test whether an item is currently queued.
		- `UpdateQueue.whenComplete(callback)`: call a function after queued synchronous and asynchronous updates complete.
		- `UpdateQueue.untilComplete()`: return a promise that resolves after the current update cycle completes.
		- `UpdateQueue.untilDeepComplete(depth?)`: wait for an update cycle and additional microtask turns, including update cycles started by them.
		- `barrierDOMReading()` / `barrierDOMWriting()`: group DOM reads before DOM writes to reduce layout thrashing.
		- `untilBarriersComplete()`: wait until all pending DOM barriers complete.

	- **Utils**:
		- `AnimationFrame.requestCurrent(callback)`: request a callback in the current frame when possible, otherwise in the next frame.
		- `AnimationFrame.requestNext(callback)`: request a callback in the next animation frame.
		- `AnimationFrame.cancel(id)`: cancel a callback requested through `AnimationFrame`.
		- `bindCallback(callback, scope)`: bind and cache a callback for a scope, returning the same bound function for the same pair.
		- `promisify(fn, scope?)`: convert a callback-taking function into a promise.

- **Structs**:
	- `MiniHeap`: a small generic minimum heap used to keep values ordered by a comparer.

- **Types**:
	- `Updatable`: the queue contract containing an `iid`, `willUpdate`, and synchronous or asynchronous `update` method.


## Development

Run the web runtime tests:

```bash
npm run test-web -- --run
```

Build the web runtime:

```bash
npm run build-web
```



## Production

You should config your bundle tool to eliminate `IN_DEV` by replacing it to `false`.



## Use transformer API

Use default export at `lupos/transformer` to do custom transformation.

Note you may need to set `"moduleResolution": "Bundler"` in `tsconfig.json`.



## Weakness

**lupos** is not perfect yet.

- Can only work with TypeScript, and slows TypeScript compiling speed.
- If a library made by **lupos**, normally places use this library should also be compiled by **lupos**. There are some solutions existing, which will be provided when required.
- Some expressions, like `let newItems = observedItems.filter(...)`, you may expect `newItems` to become observed, but in fact it's not. Plan to indicate observed state of expressions by vscode plugin decorate feature.



## FAQ

### Why name is **lupos**?

When I first started implementing this library in 2024, I was playing WoW Classic, and just tamed my lifelong companion **Lupos**.

I hope this library will play the roles in my development just like **Lupos** in my WoW adventures.

![lupos-of-wow](https://github.com/pucelle/lupos/raw/master/images/lupos-of-wow.jpg)


### Why created **lupos**?

I'm not satisfied with today's frameworks or libraries. They made tools for simplifying daily web development, but these tools becomes too complex, all what you are doing is to be trained using these tools, not design itself.

In my early stage of work, I used [Ext.js](https://www.sencha.com/products/extjs/) framework much, it solves complex problems elegantly through component design. **Ext.js** has totally affected my code style, and way of thinking.

**lupos** brings very few new concepts, and try to fill the missing parts on implementing components.


### What's origin of **lupos**?

#### 2013

In 2013, I'm learning AngularJS, but find it's source code is incredibly difficult to understand, so I created a [small library](https://github.com/purhya/vm-2013) which helps me to understand it.

During coding, I realized expressions like `$bind="name"` will change `name` property. So naturally after `name` property changed, only need to update places like `{{name}}` where replies on `name` property, so I implemented it.


#### 2017

In 2017, drawing from my experience in AngularJS and VueJS, I wrote a [new library](https://github.com/purhya/vm-2017). This library focus on component implementation, and uses **Proxy APIs** to track object properties.

The new tracking system with **Proxy APIs** make it performs like a real library, but brings new problems -- besides performance issues, the primary is: the proxied object becomes another object, not original.

This led me to search for a better and simpler solution.


#### 2019

In 2019, I created [flit.js](https://github.com/purhya/flit.js), it gets inspired by [lit-html](https://lit-html.polymer-project.org/) and adopt `` html`...` `` syntax for component templates.

This library made a big progress, but I still hadn't discovered a solution to replace **Proxy APIs** for property tracking.


#### 2022

In 2022, on the bus heading to my hometown, I suddenly realized I can implement a TypeScript Transformer, which simply inject `trackGet` and `trackSet` besides to do properties tracking, similar to what I did in 2013, but empowered by TypeScript. After a full cycle, everything go to it's origin.


#### 2024

The work had finally began, what's unexpected is that it's much harder than I thought before.

Finally it comes out, [ff-ui](https://github.com/pucelle/ff-ui) and some internal apps prove it works, and efficient.
