import {MiniHeap} from '../structs'
import {AnimationFrame, bindCallback, promiseWithResolves} from '../utils'


/** Indicates queue update phase. */
const enum QueueUpdatePhase {

	/** Nothing to update. */
	NotStarted,

	/** Will update in next animation frame. */
	Prepended,

	/** Are updating, back to `NotStarted` after ended. */
	Updating,
}


type UpdateCallback = () => void | Promise<void>


/** Caches things that need to be update. */
class UpdateHeap {
	
	/** Cache existed callbacks. */
	private set: Set<UpdateCallback> = new Set()

	/** Dynamically sorted callbacks. */
	private heap: MiniHeap<{callback: UpdateCallback, order: number}>

	constructor() {
		this.heap = new MiniHeap(function(a, b) {
			return a.order - b.order
		})
	}

	isEmpty() {
		return this.heap.isEmpty()
	}

	has(callback: UpdateCallback, scope: object | null): boolean {
		return this.set.has(bindCallback(callback, scope))
	}

	add(callback: UpdateCallback, scope: object | null, order: number) {
		let boundCallback = bindCallback(callback, scope)

		this.heap.add({
			callback: boundCallback,
			order,
		})

		this.set.add(boundCallback)
	}

	shift() {
		let {callback} = this.heap.popHead()!
		this.set.delete(callback)
		
		return callback
	}

	clear() {
		this.set = new Set()
		this.heap.clear()
	}
}


/** Caches all callbacks in order. */
const heap: UpdateHeap = /*#__PURE__*/new UpdateHeap()

/** Callbacks wait to be called after all the things update. */
let updateCompleteCallbacks: (() => void)[] = []

/** What's updating right now. */
let phase: QueueUpdatePhase = QueueUpdatePhase.NotStarted


/** 
 * Enqueue a callback with a scope, will call it before the next animate frame.
 *  
 * `order` specifies the callback order:
 *  - For a watcher / effector / computer, it's default value `0`.
 * 	- For a component, it's the incremental id of this component.
 * 
 * Note you should prevent adding same callback multiple times before updating.
 * E.g., you may implement a `needsUpdate` property, and avoid enqueuing if it's still `true`.
 * 
 * `callback` can be an async function, but note never place `untilUpdateComplete` into it,
 * or the whole callback and whole queue will be stuck and never run.
 */
export function enqueueUpdate(callback: UpdateCallback, scope: object | null = null, order: number = 0) {
	heap.add(callback, scope, order)
	willUpdateIfNotYet()
}


/** 
 * Enqueue a callback with a scope, will call it when:
 * 	- Before all enqueued callbacks with order `0`, normally watchers / effectors / computers.
 *  - After all components update callbacks.
 * 
 * `callback` can be an async function, but note never place `untilUpdateComplete` into it,
 * or the whole callback and whole queue will be stuck and never run.
 */
export function enqueueAfterDataApplied(callback: UpdateCallback, scope: object | null = null) {
	heap.add(callback, scope, 0.5)
	willUpdateIfNotYet()
}


/** 
 * Returns a promise which will be resolved after all the enqueued callbacks called.
 * Can safely read computed style and rendered properties after promise resolved.
 * 
 * Note 'never' await it in an async update, or whole update process will be stuck.
 */
export function untilUpdateComplete(): Promise<void> {
	let {promise, resolve} = promiseWithResolves()
	updateCompleteCallbacks.push(resolve)
	willUpdateIfNotYet()
	
	return promise
}


/** Enqueue a update task if not have. */
function willUpdateIfNotYet() {
	if (phase === QueueUpdatePhase.NotStarted) {
		AnimationFrame.requestCurrent(update)
		phase = QueueUpdatePhase.Prepended
	}
}


/** Do updating. */
async function update() {
	phase = QueueUpdatePhase.Updating

	try {
		while (!heap.isEmpty() || updateCompleteCallbacks.length > 0) {
			while (!heap.isEmpty()) {
				let promises: Promise<void>[] = []

				do {
					let callback = heap.shift()!
					let returned = callback()

					if (returned) {
						promises.push(returned)
					}
				}
				while (!heap.isEmpty())

				// Here starts all the async updates at same time,
				// means if parent component want to remove child in an async update,
				// child component may be in updating.
				if (promises.length > 0) {
					await Promise.all(promises)
				}
			}

			let callbacks = updateCompleteCallbacks
			updateCompleteCallbacks = []

			// Calls callbacks, all components and watchers become stable now.
			for (let callback of callbacks) {
				callback()
			}

			// Wait for a micro task to see if more callbacks come.
			await Promise.resolve()

			// Wait for those very deep micro tasks to be completed.
			// Bad part is it may postpone callback to next frame.
			// await sleep(0)
		}
	}
	catch (err) {
		console.error(err)
	}

	// Back to start stage.
	phase = QueueUpdatePhase.NotStarted
}


/** Wait for a macro task tick. */
function sleep() {
	let {promise, resolve} = promiseWithResolves()
	setTimeout(resolve, 0)
	return promise
}


/** Wait until document state becomes complete. */
function untilDocumentComplete(): Promise<void> {
	if (document.readyState === "complete") {
		return Promise.resolve()
	}

	let {promise, resolve} = promiseWithResolves()
	document.addEventListener('readystatechange', () => {
		resolve()
	})

	return promise
}


/** Promise to be resolved after first paint complete. */
let firstPaintPromise = /*#__PURE__*/(async () => {

	// Avoid error in node environment.
	if (typeof document === 'undefined') {
		return
	}

	await untilDocumentComplete()
	await sleep()
})()


/** 
 * Returns a promise, which will be resolved after the first time
 * update complete, and browser paint completed.
 * 
 * If a component will read dom properties and cause force re-layout
 * before first paint, you may use this to wait for paint complete.
 */
export function untilFirstPaintCompleted(): Promise<void> {
	return firstPaintPromise
}
