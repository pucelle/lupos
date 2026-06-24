import {beginTrack, DependencyTracker, endTrack, untrack} from '../dependency-tracker'
import {UpdateQueue} from '../../queue/update-queue'
import {makeObserverIID} from './order'
import {Updatable} from '../../types'


const enum AsyncComputedValueState {
	Initial,
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


	readonly iid

	private getter: () => Promise<V>
	private onReset: (() => void) | undefined
	private continuous: boolean
	private promise: Promise<V> | undefined
	private value: V | undefined = undefined
	private valueState: AsyncComputedValueState = AsyncComputedValueState.Initial
	private tracker: DependencyTracker | null = null
	private trackerSnapshot: any[] | null = null
	private connected: boolean = false

	/** 
	 * By default when next async request send, will reset current value to `undefined`.
	 * If specified `continuous` as `true`, will not reset and keep the value continuous.
	 */
	constructor(getter: () => Promise<V>, onReset?: () => void, scope?: any, continuous?: boolean) {
		this.getter = scope ? getter.bind(scope) : getter
		this.onReset = onReset && scope ? onReset.bind(scope) : onReset
		this.continuous = continuous ?? false
		this.iid = makeObserverIID(scope?.iid)
	}

	connect() {
		this.connected = true
		this.willUpdate()
	}

	disconnect() {
		this.connected = false
		this.tracker?.remove()
	}

	willUpdate() {
		if (!this.connected) {
			return
		}

		// Here doesn't reset value immediately after dependency get changed,
		// but update them in the same order with effectors and watchers.

		// This means you can still get old value after any dependency changes,
		// before next time update.

		UpdateQueue.enqueue(this)
	}

	update() {
		if (!this.connected) {
			return
		}

		// For the update, it only reset state,
		// and the final state will be computed when required.
		if (this.shouldUpdate()) {
			this.valueState = AsyncComputedValueState.Initial
			this.onReset?.()
			
			// Not like `@computed`, it begins to compute new value immediately.
			return this.updateValue()
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

	/** Update current value. */
	protected updateValue(): Promise<any> | void {
		this.valueState = AsyncComputedValueState.Loading
		let meetsError = false
		let result: any

		try {
			this.tracker = beginTrack(this)
			result = this.getter()

			if (result instanceof Promise) {

				// Reset to undefined if not continuous.
				if (!this.continuous) {
					this.value = undefined
				}

				// Note for `continuous` mode, even the value persist still,
				// will also cause those which depend on it to get updated.

				result = result
					.then((value: V) => {
						if (result === this.promise) {
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
					
				this.promise = result
			}
			else {
				this.valueState = AsyncComputedValueState.Fresh
				this.value = result
			}
		}
		catch (err) {
			this.valueState = AsyncComputedValueState.Fresh
			this.value = undefined
			
			meetsError = true
			console.error(err)
		}

		endTrack(meetsError)

		if (this.tracker) {
			this.trackerSnapshot = this.tracker.makeSnapshot()
		}

		return result
	}

	/** If not connected, will always get old value. */
	get(): V | undefined {
		if (this.valueState === AsyncComputedValueState.Initial) {
			this.updateValue()
		}

		return this.value
	}

	clear() {
		untrack(this)
	}
}
