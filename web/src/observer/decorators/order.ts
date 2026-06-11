/** 
 * Start incremental order.
 * Smaller than 0 because we want observers update before components.
 */
let CurrentOrder = -1


/** 
 * Get an iid for watchers, effectors, computers.
 * To ensure get updated firstly by context order,
 * then by the order of adding those items. 
 */
export function makeObserverIID(contextIID: number | undefined = 0): number {

	// By IEEE-754, when value range in `1e7`, needs `2.22e-9` precision.
	return contextIID += (CurrentOrder += 1e-8)
}