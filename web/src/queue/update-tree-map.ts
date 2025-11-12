import {InternalSetMap} from '../structs/map'
import {Updatable} from '../types'


/** updating upd list, and all their related child upd. */
interface UpdatableInfo {

	/** Not update complete child count. */
	childCount: number

	/** Calls them after all children update completed. */
	callbacks: (() => void)[]
}


/** To manage upd `Parent <=> Child` relationship. */
export class UpdatableTreeMap {

	/** Child -> Parent map. */
	private parentMap: InternalSetMap<Updatable, Updatable> = new InternalSetMap()
	private infoMap: Map<Updatable, UpdatableInfo> = new Map()

	/** Only after having child enqueued, initialize info. */
	private ensureInfo(upd: Updatable): UpdatableInfo {
		let info = this.infoMap.get(upd)
		if (!info) {
			info = {
				childCount: 0,
				callbacks: [],
			}

			this.infoMap.set(upd, info)
		}

		return info
	}

	/** 
	 * Get a promise which will be resolved after all children update completed.
	 * Must call it after updated child properties.
	 */
	addChildCompleteCallback(upd: Updatable, callback: () => void) {
		let info = this.ensureInfo(upd)
		info.callbacks.push(callback)
	}

	/** On enqueue an Updatable when doing sync updating. */
	onEnqueue(upd: Updatable, updating: Updatable) {
		if (upd.iid > updating.iid) {
			if (!this.parentMap.has(upd, updating)) {
				this.parentMap.add(upd, updating)
				let parentInfo = this.ensureInfo(updating)
				parentInfo.childCount++
			}
		}
	}

	/** On after synchronous or asynchronous update ended. */
	onCheck(upd: Updatable) {
		let info = this.infoMap.get(upd)
		if (!info || info.childCount === 0) {	
			this.complete(upd, info)
		}
	}

	/** After an updatable complete, need to complete parent recursively. */
	private complete(upd: Updatable, info: UpdatableInfo | undefined) {
		if (info) {
			this.infoMap.delete(upd)

			for (let callback of info.callbacks) {
				callback()
			}
		}

		let parents = this.parentMap.get(upd)
		if (!parents) {
			return
		}

		this.parentMap.deleteOf(upd)

		for (let parent of parents) {
			let parentInfo = this.infoMap.get(parent)!
			let count = parentInfo.childCount - 1

			if (count === 0) {
				this.complete(parent, parentInfo)
			}
			else {
				parentInfo.childCount = count
			}
		}
	}
}


/** 
 * This debug function will be eliminated in production mode.
 * It doesn't work as expected because of some reusing components like `<Popup>`.
 */
// function debug(upd: Updatable, updating: Updatable) {
// 	if (upd.iid === updating.iid) {
// 		console.warn(`Itself re-enqueued when updating:`, upd)
// 	}
// 	else {
// 		console.warn(`Outer enqueued when updating inner:`, upd, updating)
// 	}
// }