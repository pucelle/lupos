/** 
 * Start incremental order.
 * Also reset it to `0` after each time update completed.
 */
export let incrementalOrder = 0


/** 
 * Get an order for watchers, effectors, computers.
 * To ensure output in the same order of adding those items.
 */
export function getIncrementalOrder(): number {
	return incrementalOrder += Number.EPSILON
}