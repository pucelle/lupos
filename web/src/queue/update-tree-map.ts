import {Updatable} from '../types'
import {promiseWithResolves} from '../utils'


/** updating upd list, and all their related child upd. */
interface UpdatableInfo {

	/** Not update complete child count. */
	childCount: number

	promise: Promise<void>
	resolve: () => void
}


/** To manage upd `Parent <=> Child` relationship. */
export class UpdatableTreeMap {

	/** If a -> b, b -> a, will cause both can't release. */
	private childParentMap: Map<Updatable, Updatable> = new Map()
	private infoMap: Map<Updatable, UpdatableInfo> = new Map()
	private updating: Updatable | null = null

	/** Only after subscribe, or have child enqueued, initialize info. */
	private getInfo(upd: Updatable): UpdatableInfo {
		let info = this.infoMap.get(upd)
		if (!info) {
			let {promise, resolve} = promiseWithResolves()

			info = {
				childCount: 0,
				promise,
				resolve,
			}

			this.infoMap.set(upd, info)
		}

		return info
	}

	/** On enqueue an upd. */
	onEnqueue(upd: Updatable) {
		if (this.updating) {
			if (upd.iid > this.updating.iid) {
				this.childParentMap.set(upd, this.updating)
				let parentInfo = this.getInfo(this.updating)
				parentInfo.childCount++
			}
			else {
				debug(upd, this.updating)
			}
		}
	}

	/** On update started. */
	onUpdateStart(upd: Updatable) {
		this.updating = upd
	}

	/** On update ended. */
	onUpdateEnd(upd: Updatable) {
		let info = this.infoMap.get(upd)

		if (!info) {	
			this.complete(upd)
		}
		else if (info.childCount === 0) {
			this.infoMap.delete(upd)
			info.resolve()
			this.complete(upd)
		}
	}

	/** 
	 * Get a promise which will be resolved after all children update completed.
	 * Must call it after updated child properties.
	 */
	getChildCompletePromise(upd: Updatable): Promise<void> {
		if (upd === this.updating) {
			let info = this.getInfo(upd)
			return info.promise
		}
		else {
			let info = this.infoMap.get(upd)
			if (info) {
				return info.promise
			}
			else {
				return Promise.resolve()
			}
		}
	}

	/** After an updatable complete, need to complete parent recursively. */
	private complete(upd: Updatable) {
		let parent = this.childParentMap.get(upd)
		if (parent) {
			this.childParentMap.delete(upd)

			let parentInfo = this.infoMap.get(parent)!
			let count = parentInfo.childCount - 1

			if (count === 0) {
				this.infoMap.delete(parent)
				parentInfo.resolve()
				this.complete(parent)
			}
			else {
				parentInfo.childCount = count
				this.updating = parent
			}
		}
	}
}


/** This debug function will be eliminated in production mode. */
function debug(upd: Updatable, updating: Updatable) {
	console.warn(`Outer get enqueued when updating inner`, upd, updating)
}