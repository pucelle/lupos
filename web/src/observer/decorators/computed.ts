import {beginTrack, DependencyTracker, endTrack, untrack} from '../dependency-tracker'
import {UpdateQueue} from '../../queue/update-queue'
import {getIncrementalOrder} from './order'
import {Updatable} from '../../types'


const enum ComputedValueState {
	Initial,
	Stale,
	Fresh,
}


/** 
 * Make a similar computed getter from a getter function.
 * and automatically re-computing the value after any dependency changed.
 * 
 * Note: it gets updated in initialization order of all effectors / computers / watchers.
 */
export class Computed<V = any> implements Updatable {

	/** Make a quick getter by a getter function. */
	static getter<V>(getter: () => V, scope?: any): () => V {
		let computer = new Computed(getter, undefined, scope)

		return () => {
			return computer.get()
		}
	}


	readonly iid = getIncrementalOrder()

	private getter: () => V
	private onReset: (() => void) | undefined
	private value: V | undefined = undefined
	private valueState: ComputedValueState = ComputedValueState.Initial
	private tracker: DependencyTracker | null = null
	private trackerSnapshot: any[] | null = null

	constructor(getter: () => V, onReset?: () => void, scope?: any) {
		this.getter = scope ? getter.bind(scope) : getter
		this.onReset = onReset && scope ? onReset.bind(scope) : onReset
	}

	connect() {
		if (this.valueState === ComputedValueState.Initial) {
			return
		}

		this.willUpdate()
	}

	disconnect() {
		this.tracker?.remove()

		// Treat as fresh after connected.
		if (this.valueState === ComputedValueState.Stale) {
			this.valueState = ComputedValueState.Fresh
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
		if (this.shouldUpdate()) {
			this.doUpdate()
		}
		else if (!this.tracker!.tracking) {
			this.tracker!.apply()
		}
	}

	/** Returns whether have changed and need to update. */
	private shouldUpdate(): boolean {
		if (this.valueState === ComputedValueState.Fresh && this.trackerSnapshot) {
			return this.tracker!.compareSnapshot(this.trackerSnapshot)
		}
		else {
			return true
		}
	}

	private doUpdate() {
		this.valueState = ComputedValueState.Stale
		this.onReset?.()
	}

	/** If not connected, will always get old value. */
	get(): V {
		if (this.valueState === ComputedValueState.Fresh) {
			return this.value!
		}

		try {
			this.tracker = beginTrack(this)
			this.value = this.getter()
			this.valueState = ComputedValueState.Fresh
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

		return this.value!
	}

	clear() {
		untrack(this)
	}
}
