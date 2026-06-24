import {beginTrack, DependencyTracker, endTrack, untrack} from '../dependency-tracker'
import {UpdateQueue} from '../../queue'
import {makeObserverIID} from './order'
import {Updatable} from '../../types'


/** 
 * Execute `fn` immediately, and if any dependency it used get changed, re-execute `fn`.
 * Note `fn` can only be called once in a event loop.
 * 
 * If a method decorated with `@effect`, both get and set type tracking can exist.
 * But if you instantiate `Effector` by yourself, you should separate get and set
 * type of parts separately by move get or set part to a new method.
 * 
 * Note: it gets updated in initialization order of all effectors / computers / watchers.
 */
export class Effector implements Updatable {

	readonly iid

	private fn: () => void
	private tracker: DependencyTracker | null = null
	private trackerSnapshot: any[] | null = null
	private connected: boolean = false

	constructor(fn: () => void, scope?: any) {
		this.fn = scope ? fn.bind(scope) : fn
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

		UpdateQueue.enqueue(this)
	}

	update() {
		if (!this.connected) {
			return
		}
		
		if (this.shouldUpdate()) {
			return this.doUpdate()
		}
		else if (!this.tracker!.tracking) {
			this.tracker!.apply()
		}
	}

	/** Returns whether have changed and need to update. */
	private shouldUpdate(): boolean {
		if (this.trackerSnapshot) {
			return this.tracker!.compareSnapshot(this.trackerSnapshot)
		}
		else {
			return true
		}
	}

	private doUpdate() {
		let meetsError = false
		let result: any

		try {
			this.tracker = beginTrack(this)
			result = this.fn()
		}
		catch (err) {
			meetsError = true
			console.error(err)
		}

		endTrack(meetsError)

		if (this.tracker) {
			this.trackerSnapshot = this.tracker.makeSnapshot()
		}

		return result
	}

	clear() {
		untrack(this)
	}
}
