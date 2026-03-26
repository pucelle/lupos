/** 
 * Normally we would suggest you use callback, and when needed,
 * you may transform callback to promise by this.
 */
export function promisify(fn: (callback: () => void) => void, scope: any = null) {
	return new Promise<void>((resolve) => {
		fn.call(scope, resolve)
	})
}
