
export enum ObservedStateMask {

	/** 
	 * Track self.
	 * Also means we are watching the mutable of an expression.
	 */
	Self = 1,

	/** 
	 * Track elements.
	 * Also means we are observing an object,
	 * or we are watching the mutable of all properties of an expression.
	 */
	Elements = 2,
}

