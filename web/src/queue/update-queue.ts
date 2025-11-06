import {MiniHeap} from '../structs'
import {Updatable} from '../types'
import {AnimationFrame, promiseWithResolves} from '../utils'
import {UpdatableTreeMap} from './update-tree-map'


/** Indicates queue update phase. */
const enum QueueUpdatePhase {

	/** Nothing to update. */
	NotStarted,

	/** Will update in next animation frame. */
	Prepended,

	/** Are updating, back to `NotStarted` after ended. */
	Updating,
}


/** Caches things that need to be update. */
class UpdateHeap {
	
	/** Cache existed callbacks. */
	private set: Set<Updatable> = new Set()

	/** Dynamically sorted callbacks. */
	private heap: MiniHeap<Updatable>

	constructor() {
		this.heap = new MiniHeap(function(a, b) {
			return a.iid - b.iid
		})
	}

	isEmpty() {
		return this.heap.isEmpty()
	}

	has(udp: Updatable): boolean {
		return this.set.has(udp)
	}

	add(udp: Updatable) {
		this.heap.add(udp)
		this.set.add(udp)
	}

	shift() {
		let udp = this.heap.popHead()!
		this.set.delete(udp)
		return udp
	}

	clear() {
		this.set = new Set()
		this.heap.clear()
	}
}


/** Caches all callbacks in order. */
const Heap: UpdateHeap = /*#__PURE__*/new UpdateHeap()

/** Callbacks wait to be called after all the things update. */
let updateCompleteCallbacks: (() => void)[] = []

/** What's updating right now. */
let phase: QueueUpdatePhase = QueueUpdatePhase.NotStarted

/** To support tracking child complete and do callback. */
const TreeMap: UpdatableTreeMap = /*#__PURE__*/new UpdatableTreeMap()


/** 
 * Enqueue a callback with a scope, will call it before the next animate frame.
 *  
 * `order` specifies the callback order:
 *  - For a watcher / effector / computer, it's default value `0`.
 * 	- For a component, it's the incremental id of this component.
 * 
 * `callback` can be an async function, but note never place `untilUpdateComplete` into it,
 * or the whole callback and whole queue will be stuck and never run.
 */
export function enqueueUpdate(udp: Updatable) {

	// Although has been enqueued independently, here must enqueue to TreeMap.
	TreeMap.onEnqueue(udp)

	if (!Heap.has(udp)) {
		Heap.add(udp)
		willUpdateIfNotYet()
	}
}


/** 
 * Enqueue a promise, which will be resolved after all children,
 * and all descendants update completed.
 * 
 * Use it when you need to wait for child and descendant components
 * update completed and do some measurement.
 */
export function untilChildUpdateComplete(udp: Updatable): Promise<void> {
	return TreeMap.getChildCompletePromise(udp)
}


/** 
 * Returns a promise which will be resolved after all the enqueued callbacks called.
 * Can safely read computed style and rendered properties after promise resolved.
 * 
 * Note 'never' await it in an async update, or whole update process will be stuck.
 */
export function untilAllUpdateComplete(): Promise<void> {
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
		while (!Heap.isEmpty() || updateCompleteCallbacks.length > 0) {
			while (!Heap.isEmpty()) {
				let promises: Promise<void>[] = []

				do {
					let udp = Heap.shift()!
					TreeMap.onUpdateStart(udp)

					let returned = udp.update()

					if (returned) {
						promises.push(returned)
						returned.then(() => {
							TreeMap.onUpdateEnd(udp)
						})
					}
					else {
						TreeMap.onUpdateEnd(udp)
					}
				}
				while (!Heap.isEmpty())

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
