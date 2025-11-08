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


/** Indicates queue update phase. */
const enum QueueUpdatePhase {

	/** Nothing to update. */
	NotStarted,

	/** Will update in next animation frame. */
	WillUpdate,

	/** Are updating, back to `NotStarted` after ended. */
	Updating,

	/** Are waiting for async updates complete. */
	WaitingAsync,

	/** Will update newly added in a sub update process. */
	WillUpdateSub,

	/** Are calling complete callbacks. */
	CallingCompleteCallbacks,
}


class UpdateQueueClass {
		
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

	/** Avoid same async update happens at same time. */
	private asyncUpdatingSet: Set<Updatable> = new Set()

	/** Synchronous updatable that is updating. */
	private updating: Updatable | null = null

	/** 
	 * On before synchronous update start.
	 * For an async update, you should call this before doing synchronous update.
	 */
	onSyncUpdateStart(upd: Updatable) {
		this.updating = upd
	}

	/** 
	 * On after synchronous update ended.
	 * For an async update, you should call this after synchronous update did.
	 */
	onSyncUpdateEnd() {
		this.updating = null
	}

	/** 
	 * Enqueue a callback with a scope, will call it before the next animate frame.
	 * 
	 * `update` method can be an async function, but note never place `untilUpdateComplete` into it,
	 * or the whole callback and whole queue will be stuck and never run.
	 */
	enqueue(upd: Updatable) {

		// Already in updating.
		if (this.asyncUpdatingSet.has(upd)) {
			return
		}

		// Although has been enqueued independently, here must enqueue to TreeMap.
		if (upd.iid >= 1 && this.updating) {
			this.treeMap.onEnqueue(upd, this.updating)
		}

		// Must update it immediately, or it will be stuck because can't resolve promises.
		if (this.phase === QueueUpdatePhase.WaitingAsync) {
			this.updateEach(upd)
		}
		else if (!this.heap.has(upd)) {
			this.heap.add(upd)
			this.willUpdate()
		}
	}

	/** Whether target updatable has been enqueued and not. */
	hasEnqueued(upd: Updatable): boolean {
		return this.heap.has(upd)
	}

	/** 
	 * Enqueue a promise, which will be resolved after all children,
	 * and all descendants update completed.
	 * 
	 * Use it when you need to wait for child and descendant components
	 * update completed and do some measurement.
	 * 
	 * ```ts
	 * async update() {
	 *     this.updateRendering()
	 *     await untilChildCompletePromise()
	 *     await barrierDOMReading()
	 *     ...
	 * }
	 * ```
	 */
	untilChildComplete(upd: Updatable): Promise<void> {
		return this.treeMap.getChildCompletePromise(upd)
	}

	/** 
	 * Returns a promise which will be resolved after all the enqueued callbacks called.
	 * Can safely read computed style and rendered properties after promise resolved.
	 * 
	 * Note 'never' await it in an async update, or whole update process will be stuck.
	 */
	untilAllComplete(): Promise<void> {
		let {promise, resolve} = promiseWithResolves()
		this.addCompleteCallback(resolve)
		return promise
	}

	/** Enqueue a update task if not have. */
	willUpdate() {
		if (this.phase === QueueUpdatePhase.NotStarted) {
			AnimationFrame.requestCurrent(this.update.bind(this))
			this.phase = QueueUpdatePhase.WillUpdate
		}
		else if (this.phase === QueueUpdatePhase.WaitingAsync) {
			AnimationFrame.requestCurrent(this.updateSub.bind(this))
			this.phase = QueueUpdatePhase.WillUpdateSub
		}
	}

	/** Add a complete callback. */
	addCompleteCallback(callback: () => void) {
		this.completeCallbacks.push(callback)
		this.willUpdate()
	}

	/** Do updating. */
	private async update() {
		while (!this.heap.isEmpty() || this.completeCallbacks.length > 0) {
			this.phase = QueueUpdatePhase.Updating

			while (!this.heap.isEmpty()) {
				let upd = this.heap.popHead()!
				this.updateEach(upd)
			}


			// Here starts all the async updates at same time,
			// means if parent component want to remove child in an async update,
			// child component may be in updating.
			this.phase = QueueUpdatePhase.WaitingAsync

			// Promise list may be pushed by sub updates.
			for (let i = 0; i < this.promises.length; i++) {
				await this.promises[i]
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

		// Back to start stage.
		this.phase = QueueUpdatePhase.NotStarted
	}

	/** Do updating to clear heap only. */
	private async updateSub() {
		while (!this.heap.isEmpty()) {
			let upd = this.heap.popHead()!
			this.updateEach(upd)
		}

		this.phase = QueueUpdatePhase.WaitingAsync
	}

	/** Update each with error catching. */
	private updateEach(upd: Updatable) {
		try {
			if (upd.iid < 1) {
				upd.update()
			}
			else {
				this.updating = upd

				let returned = upd.update()
				if (returned) {
					let promise = returned.finally(() => {
						this.asyncUpdatingSet.delete(upd)
						this.treeMap.onUpdateEnd(upd)
					})

					this.promises.push(promise)
					this.asyncUpdatingSet.add(upd)
				}
				else {
					this.treeMap.onUpdateEnd(upd)
				}

				this.updating = null
			}
		}
		catch (err) {
			console.error(err)
		}
	}
}


/** To manage the queue of update. */
export const UpdateQueue = /*#__PURE__*/new UpdateQueueClass()