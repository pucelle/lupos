/** That updatable. */
export interface Updatable {

	/** Incremental id. */
	readonly iid: number

	/** After any tracked data change, call it to enqueue to update. */
	willUpdate: () => void

	/** Update callback, can be a promise */
	update: () => void | Promise<void>
}
