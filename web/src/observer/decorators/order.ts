/** 
 * Start incremental order.
 * Also reset it to `0` after each time update completed.
 */
let decrementalOrder = -1


/** 
 * Get an order for watchers, effectors, computers.
 * To ensure output in the same order of adding those items.
 */
export function getDecrementalOrder(): number {
	return decrementalOrder -= 1
}