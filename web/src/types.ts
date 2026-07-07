/** 
 * That updatable.
 * Note normally an updatable should also have full life-cycle,
 * so it should support connecting and disconnecting.
 */
export interface Updatable {

	/** Incremental id. */
	readonly iid: number

	/** After any tracked data change, call it to enqueue to update. */
	willUpdate: () => void

	/** Update callback, can return a promise. */
	update: () => void | Promise<void>
}
