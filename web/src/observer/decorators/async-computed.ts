import {beginTrack, DependencyTracker, endTrack, untrack} from '../dependency-tracker'
import {UpdateQueue} from '../../queue/update-queue'
import {getDecrementalOrder} from './order'
import {Updatable} from '../../types'


const enum AsyncComputedValueState {
	Initial,
	Stale,
	Loading,
	Fresh,
}


/** 
 * Make a similar computed getter from a async getter function.
 * and automatically re-computing the value after any dependency changed.
 * 
 * Note: it gets updated in initialization order of all effectors / computers / watchers.
 */
export class AsyncComputed<V = any> implements Updatable {

	/** Make a quick getter by a getter function. */
	static getter<V>(getter: () => Promise<V>, scope?: any, continuous?: boolean): () => V | undefined {
		let computer = new AsyncComputed(getter, undefined, scope, continuous)

		return () => {
			return computer.get()
		}
	}


	readonly iid = getDecrementalOrder()

	private getter: () => Promise<V>
	private onReset: (() => void) | undefined
	private continuous: boolean
	private promise: Promise<V> | undefined
	private value: V | undefined = undefined
	private valueState: AsyncComputedValueState = AsyncComputedValueState.Initial
	private tracker: DependencyTracker | null = null
	private trackerSnapshot: any[] | null = null

	/** 
	 * By default when next async request send, will reset current value to `undefined`.
	 * If specified `continuous` as true, will not reset.
	 */
	constructor(getter: () => Promise<V>, onReset?: () => void, scope?: any, continuous?: boolean) {
		this.getter = scope ? getter.bind(scope) : getter
		this.onReset = onReset && scope ? onReset.bind(scope) : onReset
		this.continuous = continuous ?? false
	}

	connect() {

		// Never computed yet.
		if (this.valueState === AsyncComputedValueState.Initial) {
			return
		}

		this.willUpdate()
	}

	disconnect() {
		this.tracker?.remove()

		// Treat as fresh after re-connected.
		if (this.valueState === AsyncComputedValueState.Stale) {
			this.valueState = AsyncComputedValueState.Fresh
		}
	}

	willUpdate() {
		// Here doesn't reset value immediately after dependency get changed,
		// but update them in the same order with effectors and watchers.

		// This means you can still get old value after any dependency changes,
		// before next time update.

		UpdateQueue.enqueue(this)
	}

	update() {

		// For the update, it only reset state,
		// and the final state will be computed when required.
		if (this.shouldUpdate()) {
			this.valueState = AsyncComputedValueState.Stale
			this.onReset?.()
		}

		// Restore tracker dependencies watching.
		else if (!this.tracker!.tracking) {
			this.tracker!.apply()
		}
	}

	/** Returns whether have changed and need to update. */
	private shouldUpdate(): boolean {
		if (this.valueState >= AsyncComputedValueState.Loading && this.trackerSnapshot) {
			return this.tracker!.compareSnapshot(this.trackerSnapshot)
		}
		else {
			return true
		}
	}

	/** If not connected, will always get old value. */
	get(): V | undefined {
		if (this.valueState === AsyncComputedValueState.Fresh
			|| this.valueState === AsyncComputedValueState.Loading
		) {
			return this.value
		}

		this.valueState = AsyncComputedValueState.Loading

		try {
			this.tracker = beginTrack(this)
			let promise = this.getter()

			if (promise instanceof Promise) {
				this.promise = promise

				// Reset to undefined if not continuous.
				if (!this.continuous) {
					this.value = undefined
				}

				// Note for `continuous` mode, even the value persist still,
				// will also cause those which depend on it to get updated.

				promise
					.then((value: V) => {
						if (promise === this.promise) {
							this.valueState = AsyncComputedValueState.Fresh
							this.value = value
							this.promise = undefined

							// Use `trackSet` to notify those which depend on it to update.
							this.onReset?.()
						}
					})
					.catch(err => {
						console.error(err)
					})
			}
			else {
				this.valueState = AsyncComputedValueState.Fresh
				this.value = promise
			}
		}
		catch (err) {
			console.error(err)
		}
		finally {
			endTrack()
		}

		if (this.tracker) {
			this.trackerSnapshot = this.tracker.makeSnapshot()
		}

		return this.value
	}

	clear() {
		untrack(this)
	}
}
