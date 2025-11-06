import {Updatable} from '../types'
import {promiseWithResolves} from '../utils'


/** updating udp list, and all their related child udp. */
interface UpdatableInfo {

	/** Not update complete child count. */
	childCount: number

	promise: Promise<void>
	resolve: () => void
}


/** To manage udp `Parent <=> Child` relationship. */
export class UpdatableTreeMap {

	private childParentMap: Map<Updatable, Updatable> = new Map()
	private infoMap: Map<Updatable, UpdatableInfo> = new Map()
	private updating: Updatable | null = null

	/** Only after subscribe, or have child enqueued, initialize info. */
	private getInfo(udp: Updatable): UpdatableInfo {
		let info = this.infoMap.get(udp)
		if (!info) {
			let {promise, resolve} = promiseWithResolves()

			info = {
				childCount: 0,
				promise,
				resolve,
			}

			this.infoMap.set(udp, info)
		}

		return info
	}

	/** On enqueue an udp. */
	onEnqueue(udp: Updatable) {
		if (this.updating) {
			this.childParentMap.set(udp, this.updating)
			let parentInfo = this.getInfo(this.updating)
			parentInfo.childCount++
		}
	}

	/** On update started. */
	onUpdateStart(udp: Updatable) {
		this.updating = udp
	}

	/** On update ended. */
	onUpdateEnd(udp: Updatable) {
		let info = this.infoMap.get(udp)

		if (!info) {	
			this.complete(udp)
		}
		else if (info.childCount === 0) {
			info.resolve()
			this.complete(udp)
		}
	}

	/** 
	 * Get a promise which will be resolved after all children update completed.
	 * Must call it after updated child properties, and before ending update:
	 * 
	 * ```ts
	 * async update() {
	 *     this.updateRendering()
	 *     await getChildCompletePromise()
	 *     ...
	 * }
	 * ```
	 */
	getChildCompletePromise(udp: Updatable): Promise<void> {
		let info = this.getInfo(udp)
		return info.promise
	}

	/** After an updatable complete, need to complete parent recursively. */
	private complete(udp: Updatable) {
		this.infoMap.delete(udp)

		let parent = this.childParentMap.get(udp)
		if (parent) {
			this.childParentMap.delete(udp)

			let parentInfo = this.infoMap.get(parent)!
			let count = parentInfo.childCount - 1

			if (count === 0) {
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