import {MiniHeap} from '../structs'
import {Updatable} from '../types'
import {AnimationFrame, promiseWithResolves} from '../utils'
import {UpdatableTreeMap} from './update-tree-map'


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

	has(upd: Updatable): boolean {
		return this.set.has(upd)
	}

	add(upd: Updatable) {
		this.heap.add(upd)
		this.set.add(upd)
	}

	getHead(): Updatable {
		return this.heap.getHead()!
	}

	popHead() {
		let upd = this.heap.popHead()!
		this.set.delete(upd)
		return upd
	}

	clear() {
		this.set = new Set()
		this.heap.clear()
	}
}


/** Whether target updatable has been enqueued and not. */
export function hasEnqueuedUpdate(upd: Updatable): boolean {
	return queue.heap.has(upd)
}


/** 
 * Enqueue a callback with a scope, will call it before the next animate frame.
 * 
 * `update` method can be an async function, but note never place `untilUpdateComplete` into it,
 * or the whole callback and whole queue will be stuck and never run.
 */
export function enqueueUpdate(upd: Updatable) {
	queue.enqueue(upd)
}


/** 
 * Enqueue a promise, which will be resolved after all children,
 * and all descendants update completed.
 * 
 * Use it when you need to wait for child and descendant components
 * update completed and do some measurement.
 */
export function untilChildUpdateComplete(upd: Updatable): Promise<void> {
	return queue.treeMap.getChildCompletePromise(upd)
}


/** 
 * Returns a promise which will be resolved after all the enqueued callbacks called.
 * Can safely read computed style and rendered properties after promise resolved.
 * 
 * Note 'never' await it in an async update, or whole update process will be stuck.
 */
export function untilAllUpdateComplete(): Promise<void> {
	let {promise, resolve} = promiseWithResolves()
	queue.addCompleteCallback(resolve)
	return promise
}



/** Indicates queue update phase. */
const enum QueueUpdatePhase {

	/** Nothing to update. */
	NotStarted,

	/** Will update in next animation frame. */
	Prepended,

	/** Are updating, back to `NotStarted` after ended. */
	UpdatingInOrder,

	/** Are waiting for async updates complete. */
	WaitingAsyncUpdates,

	/** Are calling complete callbacks. */
	CallingCompleteCallbacks,
}

class UpdateQueue {
		
	/** Caches all callbacks in order. */
	readonly heap: UpdateHeap = new UpdateHeap()

	/** To support tracking child complete and do callback. */
	readonly treeMap: UpdatableTreeMap = new UpdatableTreeMap()

	/** What's updating right now. */
	private phase: QueueUpdatePhase = QueueUpdatePhase.NotStarted

	/** Callbacks wait to be called after all the things update. */
	private completeCallbacks: (() => void)[] = []

	/** The promises that will wait for. */
	private promises: Promise<void>[] = []

	enqueue(upd: Updatable) {

		// Although has been enqueued independently, here must enqueue to TreeMap.
		this.treeMap.onEnqueue(upd)

		// Must update it immediately, or it will be stuck because can't resolve promises.
		if (this.phase === QueueUpdatePhase.WaitingAsyncUpdates) {
			this.updateOne(upd)
		}
		else if (!this.heap.has(upd)) {
			this.heap.add(upd)
			queue.willUpdate()
		}
	}

	/** Enqueue a update task if not have. */
	willUpdate() {
		if (this.phase === QueueUpdatePhase.NotStarted) {
			AnimationFrame.requestCurrent(this.update.bind(this))
			this.phase = QueueUpdatePhase.Prepended
		}
	}

	/** Add a complete callback. */
	addCompleteCallback(callback: () => void) {
		this.completeCallbacks.push(callback)
		this.willUpdate()
	}

	/** Do updating. */
	private async update() {
		try {
			while (!this.heap.isEmpty() || this.completeCallbacks.length > 0) {
				await this.updateInOrder()
			}
		}
		catch (err) {
			this.heap.clear()
			this.completeCallbacks = []
			console.error(err)
		}

		// Back to start stage.
		this.phase = QueueUpdatePhase.NotStarted
	}

	private async updateInOrder() {
		this.phase = QueueUpdatePhase.UpdatingInOrder

		while (!this.heap.isEmpty()) {
			let upd = this.heap.popHead()!
			this.updateOne(upd)
		}


		// Here starts all the async updates at same time,
		// means if parent component want to remove child in an async update,
		// child component may be in updating.
		this.phase = QueueUpdatePhase.WaitingAsyncUpdates

		while (this.promises.length > 0) {
			let promises = this.promises
			this.promises = []
			await Promise.all(promises)
		}


		this.phase = QueueUpdatePhase.CallingCompleteCallbacks
		let callbacks = this.completeCallbacks
		this.completeCallbacks = []

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

	private updateOne(upd: Updatable) {
		if (upd.iid < 1) {
			upd.update()
		}
		else {
			let returned = upd.update()
			if (returned) {
				let promise = returned.then(() => {
					this.treeMap.onUpdateEnd(upd)
				})

				this.promises.push(promise)
			}
			else {
				this.treeMap.onUpdateEnd(upd)
			}
		}
	}
}

const queue = /*#__PURE__*/new UpdateQueue()