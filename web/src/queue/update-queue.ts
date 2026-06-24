import {MiniHeap} from '../structs'
import {Updatable} from '../types'
import {AnimationFrame, promisify} from '../utils'
import {untilBarriersComplete} from './barrier-queue'


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

	/** Are calling complete callbacks. */
	CallingCompleteCallbacks,
}


class UpdateQueueClass {
		
	/** Caches all callbacks in order. */
	readonly heap: UpdateHeap = new UpdateHeap()

	/** What's updating right now. */
	private phase: QueueUpdatePhase = QueueUpdatePhase.NotStarted

	/** Callbacks wait to be called after all the things update. */
	private completeCallbacks: (() => void)[] = []

	/** 
	 * The promises that will wait for before update next component.
	 * So if a `asyncComputed` will generate data after several micro task ticks,
	 * we will wait it, but for at most several micro task ticks.
	 */
	private decoPromises: Promise<void>[] = []

	/** The promises that will wait for before fully update completed. */
	private comPromises: Promise<void>[] = []

	/** 
	 * Enqueue a callback with a scope, will call it before the next animate frame.
	 * 
	 * `update` method can be an async function, but note never place `untilUpdateComplete` into it,
	 * or the whole callback and whole queue will be stuck and never run.
	 */
	enqueue(upd: Updatable) {

		// Must update it immediately, or it will be stuck because can't resolve promises.
		if (!this.heap.has(upd)) {
			this.heap.add(upd)
			this.willUpdate()
		}
	}

	/** Whether target updatable has been enqueued or is updating. */
	hasEnqueued(upd: Updatable): boolean {
		return this.heap.has(upd)
	}

	/** 
	 * Calls callback all the enqueued callbacks called.
	 * Can safely read computed style and rendered properties after promise resolved.
	 */
	whenComplete(callback: () => void) {
		this.completeCallbacks.push(callback)
		this.willUpdate()
	}

	/** 
	 * Returns a promise which will be resolved after all the enqueued callbacks called.
	 * Can safely read computed style and rendered properties after promise resolved.
	 * 
	 * Note 'never' await it in an async update, or whole update process will be stuck.
	 */
	untilComplete(): Promise<void> {
		return promisify(this.whenComplete, this)
	}

	/** 
	 * Some times we need to wait for deep micro tasks completed.
	 * So here we specifies how many micro task ticks to wait
	 * after previous all update completed.
	 */
	async untilDeepComplete(depth: number = 1): Promise<void> {
		await this.untilComplete()

		for (let i = 0; i < depth; i++) {
			await Promise.resolve()

			// Wait for a new loop.
			if (this.phase !== QueueUpdatePhase.NotStarted) {
				i = 0
			}
		}
	}

	/** Enqueue a update task if not have. */
	willUpdate() {
		if (this.phase === QueueUpdatePhase.NotStarted) {
			AnimationFrame.requestCurrent(this.update.bind(this))
			this.phase = QueueUpdatePhase.WillUpdate
		}
		else if (this.phase === QueueUpdatePhase.WaitingAsync) {
			this.comPromises.push(Promise.resolve().then(() => this.updateSub()))
		}
	}

	/** Do updating. */
	private async update() {
		while (!this.heap.isEmpty() || this.completeCallbacks.length > 0) {
			this.phase = QueueUpdatePhase.Updating

			while (!this.heap.isEmpty()) {
				let upd = this.heap.getHead()!
				let beCom = Number.isInteger(upd.iid)

				// Will wait for several micro task ticks.
				if (beCom && this.decoPromises.length > 0) {
					await this.waitDecoPromises()
				}
				else {
					this.heap.popHead()
					this.updateEach(upd)
				}
			}


			// Here starts all the async updates once,
			// means if parent component want to remove child in an async update,
			// child component may be in updating.
			this.phase = QueueUpdatePhase.WaitingAsync

			// Promise list may be pushed by sub updates.
			while (this.comPromises.length > 0) {
				let promises = this.comPromises
				this.comPromises = []

				try {
					await Promise.all(promises)
				}
				catch (err) {
					console.warn(err)
				}
			}

			
			this.phase = QueueUpdatePhase.CallingCompleteCallbacks
			let callbacks = this.completeCallbacks
			this.completeCallbacks = []

			// Calls callbacks, all components and watchers become stable now.
			for (let callback of callbacks) {
				callback()
			}

			// Also wait for all barriers complete.
			await untilBarriersComplete()

			// Wait for those very deep micro tasks to be completed.
			// Bad part is it may postpone callbacks to next frame.
			// await sleep(0)
		}

		// Back to start stage.
		this.phase = QueueUpdatePhase.NotStarted
	}

	/** Wait for a while to see if deco promises resolved. */
	private waitDecoPromises() {
		let promises = this.decoPromises
		this.decoPromises = []

		// Wait for at most 3 micro task ticks.
		return Promise.race([
			Promise.all(promises),
			(async () => {
				await Promise.resolve()
				await Promise.resolve()
				await Promise.resolve()
			})(),
		])
	}

	/** Do updating to clear heap only. */
	private async updateSub() {
		while (!this.heap.isEmpty()) {
			let upd = this.heap.popHead()!
			this.updateEach(upd)
		}
	}

	/** Update each with error catching. */
	private updateEach(upd: Updatable) {
		try {
			if (Number.isInteger(upd.iid)) {
				let returned = upd.update()
				if (returned) {
					this.comPromises.push(returned)
				}
			}
			else {
				let returned = upd.update()
				if (returned) {
					this.decoPromises.push(returned)
				}
			}
		}
		catch (err) {
			console.error(err)
		}
	}
}


/** To manage the queue of update. */
export const UpdateQueue = /*#__PURE__*/new UpdateQueueClass()